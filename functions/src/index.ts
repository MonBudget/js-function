import * as functionsV1 from "firebase-functions";
import {onRequest} from "firebase-functions/v2/https";
import {onDocumentCreated, onDocumentDeleted, onDocumentUpdated} from "firebase-functions/v2/firestore";
import {setGlobalOptions} from "firebase-functions/v2/options";
import {beforeUserCreated} from "firebase-functions/v2/identity";
import {handleHttpRequest, isRequest} from "./shared/httpUtils";
import * as logger from "firebase-functions/logger";
import * as _allVars from "./vars";


const REGION = "europe-west1";

setGlobalOptions({
  region: REGION,
  concurrency: 1,
  minInstances: 0,
  maxInstances: 10,
  timeoutSeconds: 10,
  memory: "128MiB",
  cpu: 0.25,
});

export const allVariables = _allVars;

// verify here if it's well registered: https://firebase.google.com/docs/auth/extend-with-blocking-functions?gen=2nd#register_a_blocking_function
export const onUserCreation = beforeUserCreated({
  maxInstances: 10,
  timeoutSeconds: 10,
  secrets: [_allVars.TINK_KEYS],
}, async (event) => {
  const {handleUserCreation} = await import("./functions/handleUserCreation");
  await handleUserCreation(event);
});

export const onUserDelete = functionsV1.region(REGION)
  .runWith({
    minInstances: 0,
    maxInstances: 10, // Only a few amount of user delete expected
    timeoutSeconds: 240, // long timeout for handling the huge amount of documents to delete
    memory: "128MB",
    failurePolicy: true,
    secrets: [_allVars.TINK_KEYS],
  }).auth.user().onDelete(async (user) => {
    const {handleUserDelete} = await import("./functions/handleUserDelete");
    await handleUserDelete(user);
  });

export const WEBHOOK_PATH = "/tink-update-webhook";
export const onTinkEvent = onRequest({
  cors: true /* todo: mettre nom de domaine tink*/,
  secrets: [_allVars.TINK_KEYS],
}, handleHttpRequest(async (req, res, noRouteFound) => {
  if (isRequest(req, "POST", "/tink-update-webhook/register")) {
    const {handleWebhookRegisterRequest} = await import("./functions/handleWebhookRegisterRequest");
    return handleWebhookRegisterRequest(req);
  } else if (isRequest(req, "POST", WEBHOOK_PATH)) {
    const {handleTinkEvent} = await import("./functions/handleTinkEvent");
    return handleTinkEvent(req);
  } else {
    return noRouteFound();
  }
}));

export const onAppHttpCall = onRequest({
  cors: true,
  secrets: [_allVars.TINK_KEYS],
}, handleHttpRequest(async (req, res, noRouteFound) => {
  if (isRequest(req, "GET", "/bank-account/connect-link")) {
    const {handleBankConnectionLinkRequest} = await import("./functions/handleBankConnectionLinkRequest");
    return handleBankConnectionLinkRequest(req);
  } else if (isRequest(req, "GET", "/bank-account/refresh-link")) {
    const {handleBankConnectionRefreshRequest} = await import("./functions/handleBankConnectionRefreshRequest");
    return handleBankConnectionRefreshRequest(req);
  } else if (isRequest(req, "DELETE", "/bank-account")) {
    const {handleBankCredentialsDelete} = await import("./functions/handleBankCredentialsDelete");
    return handleBankCredentialsDelete(req);
  } else {
    return noRouteFound();
  }
}));

export const onTransactionUpdated = onDocumentUpdated("/bankAccounts/{accountId}/bankAccounts-transactions/{transactionId}", async (event) => {
  if (!event.data) {
    logger.warn("Received event onTransactionUpdated with undefined event.data");
    return;
  }
  const {onTransactionUpdated} = await import("./functions/onTransactionUpdated");
  return onTransactionUpdated({
    accountId: event.params.accountId,
    transactionId: event.params.transactionId,
    before: event.data.before,
    after: event.data.after,
  });
});

export const onExpenseRemoved = onDocumentDeleted("/expenses/{expenseId}", async (event) => {
  if (!event.data) {
    logger.warn("Received event onExpenseRemoved with undefined event.data");
    return;
  }
  const {onExpenseRemoved} = await import("./functions/onExpenseRemoved");
  return onExpenseRemoved({expenseId: event.params.expenseId, doc: event.data});
});


export const onExpenseCreated = onDocumentCreated("/expenses/{expenseId}", async (event) => {
  if (!event.data) {
    logger.warn("Received event onExpenseCreated with undefined event.data");
    return;
  }
  const {onExpenseCreated} = await import("./functions/onExpenseCreated");
  return onExpenseCreated({expenseId: event.params.expenseId, doc: event.data});
});
