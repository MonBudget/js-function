// import {onDocumentCreated, onDocumentUpdated} from "firebase-functions/v2/firestore";
import * as functionsV1 from "firebase-functions";
import * as logger from "firebase-functions/logger";
import {onRequest} from "firebase-functions/v2/https";
import {setGlobalOptions} from "firebase-functions/v2/options";
import {beforeUserCreated} from "firebase-functions/v2/identity";
import {ResponseError} from "./shared/ResponseError";


export const WEBHOOK_PATH = "/tink-update-webhook";

setGlobalOptions({
  region: "europe-west1",
  concurrency: 1,
  minInstances: 0,
  maxInstances: 1,
  timeoutSeconds: 10,
  memory: "128MiB",
  cpu: 0.25,
});


/*
export const handleUserCreation = configuredFunctionsV1.auth.user().onCreate(async (user) => {
  const {handleUserCreation} = await import("./functions/handleUserCreation");
  await handleUserCreation(user);
});
*/

// verify here if it's well registered: https://firebase.google.com/docs/auth/extend-with-blocking-functions?gen=2nd#register_a_blocking_function
export const handleUserCreationBlocking = beforeUserCreated(async (event) => {
  const {handleBlockingUserCreation} = await import("./functions/handleUserCreation");
  await handleBlockingUserCreation(event);
});

export const handleUserDelete = functionsV1.region("europe-west1")
  .runWith({
    minInstances: 0,
    maxInstances: 2,
    timeoutSeconds: 120,
    memory: "128MB",
  }).auth.user().onDelete(async (user) => {
    const {handleUserDelete} = await import("./functions/handleUserDelete");
    await handleUserDelete(user);
  });


export const handleHttpCall = onRequest({cors: true /* todo: mettre nom de domaine tink*/}, async (req, res) => {
  try {
    let body: unknown;
    if (req.path === "/tink-update-webhook/register" && req.method === "POST") {
      const {handleWebhookRegisterRequest} = await import("./functions/handleWebhookRegisterRequest");
      body = await handleWebhookRegisterRequest(req);
    } else if (req.path === WEBHOOK_PATH && req.method === "POST") {
      const {handleTinkEvent} = await import("./functions/handleTinkEvent");
      body = await handleTinkEvent(req);
    } else if (req.path === "/bank-account/connect-link" && req.method === "GET") {
      const {handleBankConnectionLinkRequest} = await import("./functions/handleBankConnectionLinkRequest");
      body = await handleBankConnectionLinkRequest(req);
    } else if (req.path === "/bank-account/refresh-link" && req.method === "GET") {
      const {handleBankConnectionRefreshRequest} = await import("./functions/handleBankConnectionRefreshRequest");
      body = await handleBankConnectionRefreshRequest(req);
    } else {
      logger.info("Request body", req.body);
      throw new ResponseError(404, "No matching handler for your request");
    }
    res.status(200).send(body);
  } catch (error) {
    if (error instanceof ResponseError) {
      res.status(error.responseCode).send({message: error.message, details: error.details});
    } else {
      logger.error("Internal error", error);
      let reason: string | undefined;
      if (error instanceof Error) {
        reason = error.message;
      } else {
        reason = error?.toString();
      }
      res.status(500).send({message: "Internal server error", reason});
    }
  }
});
