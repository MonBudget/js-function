import {Request} from "firebase-functions/v2/https";
import {firestore, startsWith} from "../firebase/firestore";
import * as logger from "firebase-functions/logger";
import {
  AccountBookedTransactionsModifiedEvent,
  AccountTransactionsModifiedEvent,
  AccountUpdatedEvent,
  RefreshFinishedEvent,
  RegisteredWebhook,
  TinkEvent,
  TinkEventSchema,
  checkTinkEventSignature} from "../tinkApi/webhook";
import {getAccessTokenForTinkUserId} from "../tinkApi/auth";
import {getAccount} from "../tinkApi/account";
import {Transaction, getAllTransactions} from "../tinkApi/transaction";
import {ResponseError} from "../shared/ResponseError";
import {saveCredentials} from "../services/credentialsService";
import {saveAccount} from "../services/accountService";
import {TransactionEntity, createTransaction, updateTransaction} from "../repository/transactionRepository";
import {getPastDate, max} from "../shared/utils";
import {BYPASS_TINK_EVENT_SIGNATURE, BYPASS_TINK_EVENT_SIGNATURE_LOCAL_ONLY, MAX_PAST_DAYS_TO_FETCH} from "../vars";
import {amountToNumber, isAnonymousExternalUserId} from "../tinkApi/shared";
import {getStableAccountId, setStableTransactionId} from "../services/anonymousStuff";


export async function handleTinkEvent(req: Request) {
  const event = TinkEventSchema.parse(req.body);

  const bypassSignatureError = BYPASS_TINK_EVENT_SIGNATURE_LOCAL_ONLY.value() && req.hostname.startsWith("127.0.0.1") || BYPASS_TINK_EVENT_SIGNATURE.value();

  try {
    if (!event.event) {
      logger.error("Missing 'event' field in body", req.body);
      throw new ResponseError(400, "Malformed event");
    }
    const baseUrl = `https://${req.hostname}`;
    const webhook = (await firestore.collection("tink-webhooks")
      .where(startsWith("url", baseUrl))
      .where("enabledEvents", "array-contains", event.event)
      .limit(1).get())
      .docs.at(0)?.data() as (RegisteredWebhook | undefined);
    const secret = webhook?.secret;
    if (webhook) {
      logger.info(`Found webhook ${webhook.id} for ${event.event}`);
    }
    if (!secret) {
      logger.warn(`No secret found for ${event.event}`);
      throw new ResponseError(400, "The given webhook event has not been registered");
    }
    await checkTinkEventSignature(req, secret);
    logger.info("Tink signature: OK");
  } catch (error) {
    logger.error("Tink signature: ERROR", error);
    if (!bypassSignatureError) {
      if (error instanceof ResponseError) {
        throw error;
      } else {
        throw new ResponseError(400, "Bad signature");
      }
    } else {
      logger.warn("Bypassing signature error...");
    }
  }

  try {
    if (isAnonymousExternalUserId(event.context.externalUserId)) {
      const firebaseUserIdDoc = (await firestore.collection("anonymousTinkUsers").doc(event.context.userId).get()).data();
      if (!firebaseUserIdDoc) {
        throw new ResponseError(400, "Received event for anonymous user, but unable to resolve real firebase userId");
      }
      event.context.externalUserId = firebaseUserIdDoc.firebaseUserId;
    }

    await processEvent(event);
  } catch (error) {
    logger.error("Error while processing event", error);
    throw error;
  }
}

async function processEvent(event: TinkEvent) {
  logger.info(`Processing event ${event.event}`, event);
  switch (event.event) {
  case "refresh:finished":
    await handleRefreshFinishedEvent(event);
    break;
  case "account:created":
    // ignored
    break;
  case "account:updated":
    await handleAccountUpdatedEvent(event);
    break;
  case "account-transactions:modified":
    await handleAccountTransactionsModifiedEvent(event);
    break;
  case "account-booked-transactions:modified":
    await handleAccountBookedTransactionsModifiedEvent(event);
    break;
  default:
    throw new ResponseError(400, "Unknown event type");
  }
}

async function handleRefreshFinishedEvent(event: RefreshFinishedEvent) {
  await saveCredentials({
    tinkUserId: event.context.userId,
    firebaseUserId: event.context.externalUserId,
    credentialsId: event.content.credentialsId,
  });
}

async function handleAccountUpdatedEvent(event: AccountUpdatedEvent) {
  logger.info(`Updating account ${event.content.id}...`);
  const accessToken = await getAccessTokenForTinkUserId(event.context.userId, ["accounts:read"]);
  const account = await getAccount({accountId: event.content.id, accessToken});
  account.id = getStableAccountId({account, firebaseUserId: event.context.externalUserId});
  const originalAccountId = event.content.id;
  await saveAccount({account, firebaseUserId: event.context.externalUserId, originalAccountId});
  logger.info(`Updated account ${event.content.id}`);
}

async function handleAccountTransactionsModifiedEvent(event: AccountTransactionsModifiedEvent) {
  await updateTransactions({
    accountId: event.content.account.id,
    firebaseUserId: event.context.externalUserId,
    tinkUserId: event.context.userId,
    pending: true,
    earliestBookedDate: undefined,
  });
}

async function handleAccountBookedTransactionsModifiedEvent(event: AccountBookedTransactionsModifiedEvent) {
  if (!event.content.account.transactionsModifiedEarliestBookedDate) {
    throw new ResponseError(400, "Missing 'transactionsModifiedEarliestBookedDate' field");
  }
  await updateTransactions({
    accountId: event.content.account.id,
    firebaseUserId: event.context.externalUserId,
    tinkUserId: event.context.userId,
    pending: false,
    earliestBookedDate: max(event.content.account.transactionsModifiedEarliestBookedDate, getPastDate(MAX_PAST_DAYS_TO_FETCH.value())),
  });
}

async function updateTransactions(params: {
  accountId: string,
  tinkUserId: string,
  firebaseUserId: string,
  pending: boolean,
  earliestBookedDate: string|undefined
}) {
  logger.info(`Updating transactions for account ${params.accountId}`);
  let totalWrittenTransactions = 0;

  const accessToken = await getAccessTokenForTinkUserId(params.tinkUserId, ["transactions:read", "accounts:read"]);

  const account = await getAccount({accessToken, accountId: params.accountId});
  const stableAccountId = getStableAccountId({account, firebaseUserId: params.firebaseUserId});

  for await (const transaction of getAllTransactions({
    accessToken,
    accountIds: [params.accountId],
    earliestBookedDate: params.earliestBookedDate,
    latestBookedDate: undefined,
    pageSize: undefined,
    status: params.pending ? "PENDING" : "BOOKED",
  })) {
    await setStableTransactionId({transaction, firebaseUserId: params.firebaseUserId});
    transaction.accountId = stableAccountId;

    // Pending transactions are updated many times until it's not pending.
    // Booked transactions are generally created once.
    if (params.pending) {
      await updateTransaction({transaction: tinkTransactionToDb(transaction, params.firebaseUserId)})
        .catch(() => createTransaction({transaction: tinkTransactionToDb(transaction, params.firebaseUserId)}));
    } else {
      await createTransaction({transaction: tinkTransactionToDb(transaction, params.firebaseUserId)})
        .catch(() => updateTransaction({transaction: tinkTransactionToDb(transaction, params.firebaseUserId)}));
    }
    totalWrittenTransactions++;
  }
  logger.info(`Written ${totalWrittenTransactions} transactions`);
}

function tinkTransactionToDb(transaction: Transaction, firebaseUserId: string): TransactionEntity {
  const dates = selectTransactionDates({valueDate: transaction.dates?.value, bookingDate: transaction.dates?.booked});
  return {
    id: transaction.id,
    accountId: transaction.accountId,
    amount: amountToNumber(transaction.amount)!,
    creationDate: dates.creationDate,
    paymentDate: dates.paymentDate,
    currencyCode: transaction.amount.currencyCode,
    descriptionCleaned: transaction.descriptions?.display ?? transaction.descriptions?.original ?? "",
    descriptionOriginal: transaction.descriptions?.original ?? "",
    pending: transaction.status == "PENDING",
    userId: firebaseUserId,
  };
}

function selectTransactionDates(params: {valueDate: string|undefined, bookingDate: string|undefined}) {
  const [creationDateRaw, paymentDateRaw] = [params.valueDate, params.bookingDate].sort();
  const creationDate = new Date(creationDateRaw ? Date.parse(creationDateRaw) : Date.now());
  return {
    creationDate: creationDate,
    paymentDate: paymentDateRaw ? new Date(Date.parse(paymentDateRaw)) : creationDate,
  };
}
