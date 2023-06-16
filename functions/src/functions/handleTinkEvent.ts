import {Request} from "firebase-functions/v2/https";
import {firestore, startsWithFilter} from "../firebase/firestore";
import {ResponseError} from "../httpUtils";
import * as logger from "firebase-functions/logger";
import {
  AccountBookedTransactionsModifiedEvent,
  AccountCreatedEvent,
  AccountTransactionsModifiedEvent,
  AccountUpdatedEvent,
  RegisteredWebhook,
  TinkEvent,
  checkTinkEventSignature} from "../tinkApi/webhook";
import {getAccessTokenForUserId} from "../tinkApi/auth";
import {getAccount} from "../tinkApi/account";
import {getAllTransactions} from "../tinkApi/transaction";
import {amountToNumber} from "../tinkApi/shared";
import {Timestamp} from "firebase-admin/firestore";


export async function handleTinkEvent(req: Request) {
  const event: TinkEvent = req.body;

  const bypassSignatureError = req.hostname.startsWith("127.0.0.1") || true; // temporary fix, because some events are not valid

  try {
    if (!event.event) {
      logger.error("Missing 'event' field in body", req.body);
      throw new ResponseError(400, "Malformed event");
    }
    const baseUrl = `https://${req.hostname}`;
    const webhook = (await firestore.collection("tink-webhooks")
      .where(startsWithFilter("url", baseUrl))
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

  await processEvent(event);
}

async function processEvent(event: TinkEvent) {
  logger.info(`Processing event ${event.event}`, event);
  switch (event.event) {
  case "refresh:finished":
    // fetch and store creds, find duplicates to unify connections like backend
    break;
  case "account:created":
    await handleAccountCreatedEvent(event);
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
    logger.error("Received an unknown tink event", event);
    throw new ResponseError(400, "Unknown event type");
  }
}

async function handleAccountUpdatedEvent(event: AccountUpdatedEvent) {
  logger.info(`Updating account ${event.content.id}`);
  await updateAccount({
    accountId: event.content.id,
    externalUserId: event.context.externalUserId,
  });
}

async function handleAccountCreatedEvent(event: AccountCreatedEvent) {
  logger.info(`Creating account ${event.content.id}`);
  await updateAccount({
    accountId: event.content.id,
    externalUserId: event.context.externalUserId,
  });
}

async function handleAccountTransactionsModifiedEvent(event: AccountTransactionsModifiedEvent) {
  await updateTransactions({
    accountId: event.content.account.id,
    externalUserId: event.context.externalUserId,
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
    externalUserId: event.context.externalUserId,
    pending: false,
    earliestBookedDate: event.content.account.transactionsModifiedEarliestBookedDate,
  });
}

async function updateAccount(params: {accountId: string, externalUserId: string}) {
  const account = await getAccount(params.accountId, await getAccessTokenForUserId(params.externalUserId, "accounts:read"));
  const accountDocument = firestore.collection("bankAccounts").doc(account.id);
  await accountDocument.set({
    id: account.id,
    userId: params.externalUserId,
    financialInstitutionId: account.financialInstitutionId,
    type: account.type,
    name: {
      original: account.name,
    },
    currencyCode: account.balances?.available?.amount?.currencyCode ?? account.balances?.booked?.amount?.currencyCode,
    currentBalance: amountToNumber(account.balances?.available?.amount),
    bookedBalance: amountToNumber(account.balances?.booked?.amount),
    lastRefresh: Timestamp.fromDate(account.dates.lastRefreshed),
    fromTink: account,
  }, {mergeFields: [
    "id",
    "userId",
    "financialInstitutionId",
    "type",
    "name.original",
    "currencyCode",
    "currentBalance",
    "bookedBalance",
    "lastRefresh",
    "fromTink",
  ]});
}

async function updateTransactions(params: {accountId: string, externalUserId: string, pending: boolean, earliestBookedDate: string|undefined}) {
  logger.info(`Updating transactions for account ${params.accountId}`);
  const bulkWriter = firestore.bulkWriter();
  const transactionsCollection = firestore.collection("bankAccounts").doc(params.accountId).collection("bankAccounts-transactions");
  let totalWrittenTransactions = 0;
  bulkWriter.onWriteResult(() => totalWrittenTransactions++);

  for await (const transaction of getAllTransactions({
    accessToken: await getAccessTokenForUserId(params.externalUserId, "transactions:read"),
    accountIds: [params.accountId],
    earliestBookedDate: params.earliestBookedDate,
    latestBookedDate: undefined,
    pageSize: undefined,
    status: params.pending ? "PENDING" : "BOOKED",
  })) {
    const rawDate = transaction.dates?.value ?? transaction.dates?.booked;
    void bulkWriter.set(transactionsCollection.doc(transaction.id), {
      id: transaction.id,
      userId: params.externalUserId,
      accountId: transaction.accountId,
      pending: params.pending,
      amount: amountToNumber(transaction.amount),
      description: {
        original: transaction.descriptions?.original,
        cleaned: transaction.descriptions?.display,
      },
      date: rawDate ? Timestamp.fromMillis(Date.parse(rawDate)) : Timestamp.now(),
      type: transaction.types.type,
      fromTink: transaction,
    }, {mergeFields: [
      "id",
      "userId",
      "accountId",
      "pending",
      "amount",
      "description.original",
      "description.cleaned",
      "date",
      "type",
      "fromTink",
    ]});
  }
  await bulkWriter.close();
  logger.info(`Written ${totalWrittenTransactions} transactions`);
}
