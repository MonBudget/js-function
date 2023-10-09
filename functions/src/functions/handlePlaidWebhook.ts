import {Request} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {SandboxItemFireWebhookRequestWebhookCodeEnum, Transaction, TransactionsSyncResponse, WebhookType} from "plaid";
import {plaidClient, savePlaidAccounts, savePlaidItem} from "../plaidApi/plaidService";
import {firestore} from "../firebase/firestore";
import {TransactionEntity, createTransaction, removeTransaction, updateTransaction} from "../repository/transactionRepository";
import {AxiosError} from "axios";

type Webhook = {
  webhook_type: WebhookType,
  webhook_code: SandboxItemFireWebhookRequestWebhookCodeEnum,
  item_id: string,
  error?: {
      error_code: string,
  }
}

export async function handlePlaidWebhook(req: Request) {
  const webhook: Webhook = req.body;

  logger.info(`${webhook.webhook_type} webhook received for item ${webhook.item_id} with code ${webhook.webhook_code}`, req.body);
  if (webhook.error) {
    return;
  }

  switch (webhook.webhook_type) {
  case WebhookType.Item:
    return handlePlaidItemWebhook(webhook);
  case WebhookType.Transactions:
    return handlePlaidTransactionsWebhook(webhook);
  default:
    logger.warn(`Received unknown webhook type: ${webhook.webhook_type}`);
  }
}
export async function handlePlaidItemWebhook(webhook: Webhook) {
  switch (webhook.webhook_code) {
  default:
    logger.warn(`Received unknown webhook code: ${webhook.webhook_code}`);
  }
}

export async function handlePlaidTransactionsWebhook(webhook: Webhook) {
  const doc = await firestore.collection("plaid-access-tokens").doc(webhook.item_id).get();
  if (!doc.exists) {
    logger.warn(`Received webhook for item ${webhook.item_id} but no accessToken associated`);
    return;
  }
  const accessToken: string = doc.get("accessToken");
  const userId: string = doc.get("userId");

  await savePlaidItem({accessToken, userId});
  await savePlaidAccounts({accessToken, userId});

  const transactionsSyncCursor: string | undefined | null = doc.get("transactionsSyncCursor");
  await saveTransactions({userId, itemId: webhook.item_id, accessToken, lastTransactionsSyncCursor: transactionsSyncCursor ?? undefined});
}

async function saveTransactions(params: {userId: string, itemId: string, accessToken: string, lastTransactionsSyncCursor?: string}) {
  const {accessToken, itemId, userId, lastTransactionsSyncCursor} = params;
  let transactionsSyncPage : TransactionsSyncResponse | undefined;

  let transactionsSyncCursor = lastTransactionsSyncCursor;

  do {
    try {
      transactionsSyncPage = (await plaidClient.transactionsSync({access_token: accessToken, cursor: transactionsSyncCursor, count: 25})).data;

      for (const transaction of transactionsSyncPage.added) {
        await createTransaction({transaction: plaidTransactionToDb(transaction, userId)})
          .catch(() => updateTransaction({transaction: plaidTransactionToDb(transaction, userId)}));
      }

      for (const transaction of transactionsSyncPage.modified) {
        await updateTransaction({transaction: plaidTransactionToDb(transaction, userId)})
          .catch(() => createTransaction({transaction: plaidTransactionToDb(transaction, userId)}));
      }

      for (const {transaction_id: transactionIdToRemove} of transactionsSyncPage.removed) {
        await removeTransaction({transactionId: transactionIdToRemove!});
      }

      transactionsSyncCursor = transactionsSyncPage.next_cursor;

      if (!transactionsSyncCursor || transactionsSyncCursor.length == 0) break; // should not arrive, but in case of to prevent infinite loop
    } catch (error) {
      if (error instanceof AxiosError && error.response?.data?.error_code == "TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION") {
        transactionsSyncCursor = lastTransactionsSyncCursor;
        transactionsSyncPage = undefined;
      } else throw error;
    }
  }
  while (!transactionsSyncPage /* in case of TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION error */ || transactionsSyncPage.has_more);

  await firestore.collection("plaid-access-tokens").doc(itemId).update({transactionsSyncCursor});
}

function plaidTransactionToDb(transaction: Transaction, userId: string): TransactionEntity {
  const dates = selectTransactionDates(transaction);

  return {
    id: transaction.transaction_id,
    accountId: transaction.account_id,
    amount: -transaction.amount, // wtf plaid set positive value when money moving out...
    paymentDate: dates.paymentDate,
    creationDate: dates.creationDate,
    currencyCode: transaction.iso_currency_code ?? transaction.unofficial_currency_code!,
    pending: transaction.pending,
    userId: userId,
    descriptionOriginal: transaction.original_description ?? transaction.name ?? "",
    descriptionCleaned: transaction.name ?? "",
  };
}

function selectTransactionDates(transaction: Transaction) {
  const [creationDateRaw, paymentDateRaw] = [transaction.datetime ?? transaction.date, transaction.authorized_datetime ?? transaction.authorized_date].sort();
  const creationDate = new Date(creationDateRaw ? Date.parse(creationDateRaw) : Date.now());
  return {
    creationDate: creationDate,
    paymentDate: paymentDateRaw ? new Date(Date.parse(paymentDateRaw)) : creationDate,
  };
}
