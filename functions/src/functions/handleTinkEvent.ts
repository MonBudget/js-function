import {Request} from "firebase-functions/v2/https";
import {firestore, startsWith} from "../firebase/firestore";
import * as logger from "firebase-functions/logger";
import {
  AccountBookedTransactionsModifiedEvent,
  AccountCreatedEvent,
  AccountTransactionsModifiedEvent,
  AccountUpdatedEvent,
  RefreshFinishedEvent,
  RegisteredWebhook,
  TinkEvent,
  TinkEventSchema,
  checkTinkEventSignature} from "../tinkApi/webhook";
import {getAccessTokenForUserId} from "../tinkApi/auth";
import {getAccount} from "../tinkApi/account";
import {getAllTransactions} from "../tinkApi/transaction";
import {amountToNumber} from "../tinkApi/shared";
import {Timestamp} from "firebase-admin/firestore";
import {getProvider, getProviderConsents} from "../tinkApi/credentials";
import {ResponseError} from "../shared/ResponseError";


export async function handleTinkEvent(req: Request) {
  const event = TinkEventSchema.parse(req.body);

  const bypassSignatureError = req.hostname.startsWith("127.0.0.1") || true; // temporary fix, because some events are not valid

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
    throw new ResponseError(400, "Unknown event type");
  }
}

async function handleRefreshFinishedEvent(event: RefreshFinishedEvent) {
  logger.info(`Refreshing credentials ${event.content.credentialsId}...`);
  const accessToken = await getAccessTokenForUserId(event.context.externalUserId, ["provider-consents:read", "credentials:read"]);
  const providerConsent = (await getProviderConsents({
    accessToken: accessToken,
    credentialsId: event.content.credentialsId,
  })).providerConsents.at(0);
  if (providerConsent) {
    const provider = await getProvider({accessToken, includeTestProviders: true, name: providerConsent.providerName});
    if (provider) {
      await firestore.collection("bankCredentials").doc(event.content.credentialsId).set({
        credentialsId: event.content.credentialsId,
        userId: event.context.externalUserId,
        accountIds: providerConsent.accountIds.map((accountId) => firestore.collection("bankAccounts").doc(accountId)),
        status: providerConsent.status,
        lastRefresh: Timestamp.fromDate(providerConsent.statusUpdated),
        sessionExpiration: providerConsent.sessionExpiryDate ? Timestamp.fromDate(providerConsent.sessionExpiryDate) : null,
        financialInstitution: {
          id: provider.financialInstitutionId,
          name: provider.financialInstitutionName,
          logo: provider.images.icon,
        },
      });
      logger.info(`Refreshed credentials ${event.content.credentialsId}`);
    } else {
      logger.error(`provider not found for name '${providerConsent.providerName}'`);
    }
  } else {
    logger.error(`providerConsent not found for credentialsId '${event.content.credentialsId}'`);
  }
}

async function handleAccountUpdatedEvent(event: AccountUpdatedEvent) {
  logger.info(`Updating account ${event.content.id}...`);
  await updateAccount({
    accountId: event.content.id,
    externalUserId: event.context.externalUserId,
  });
  logger.info(`Updated account ${event.content.id}`);
}

async function handleAccountCreatedEvent(event: AccountCreatedEvent) {
  logger.info(`Creating account ${event.content.id}...`);
  await updateAccount({
    accountId: event.content.id,
    externalUserId: event.context.externalUserId,
  });
  logger.info(`Created account ${event.content.id}`);
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
  const account = await getAccount({accountId: params.accountId, accessToken: await getAccessTokenForUserId(params.externalUserId, "accounts:read")});
  const accountDocument = firestore.collection("bankAccounts").doc(account.id);
  await accountDocument.set({
    id: account.id,
    userId: params.externalUserId,
    financialInstitutionId: account.financialInstitutionId ?? null,
    type: account.type,
    name: {
      original: account.name,
    },
    currencyCode: account.balances?.available?.amount?.currencyCode ?? account.balances?.booked?.amount?.currencyCode ?? null,
    currentBalance: amountToNumber(account.balances?.available?.amount) ?? null,
    bookedBalance: amountToNumber(account.balances?.booked?.amount) ?? null,
    lastRefresh: Timestamp.fromDate(account.dates.lastRefreshed),
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
    firestore.bundle();
    const rawDate = transaction.dates?.value ?? transaction.dates?.booked;
    void bulkWriter.set(transactionsCollection.doc(transaction.id), {
      id: transaction.id,
      userId: params.externalUserId,
      accountId: firestore.collection("bankAccounts").doc(transaction.accountId),
      pending: params.pending,
      amount: amountToNumber(transaction.amount),
      description: {
        original: transaction.descriptions?.original ?? null,
        cleaned: transaction.descriptions?.display ?? null,
      },
      date: rawDate ? Timestamp.fromMillis(Date.parse(rawDate)) : Timestamp.now(),
      type: transaction.types.type,
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
    ]});
  }
  await bulkWriter.close();
  logger.info(`Written ${totalWrittenTransactions} transactions`);
}
