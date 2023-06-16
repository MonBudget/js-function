// import {onDocumentCreated, onDocumentUpdated} from "firebase-functions/v2/firestore";
// import {DocumentSnapshot} from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import {onRequest} from "firebase-functions/v2/https";
import {setGlobalOptions} from "firebase-functions/v2/options";
import {ResponseError} from "./httpUtils";

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

export const tinkWebhook = onRequest({cors: true /* todo: mettre nom de domaine tink*/}, async (req, res) => {
  try {
    let body: any | undefined;
    if (req.path === "/tink-update-webhook/register" && req.method === "POST") {
      const {handleWebhookRegisterRequest} = await import("./functions/handleWebhookRegisterRequest");
      body = await handleWebhookRegisterRequest(req);
    } else if (req.path === WEBHOOK_PATH && req.method === "POST") {
      const {handleTinkEvent} = await import("./functions/handleTinkEvent");
      body = await handleTinkEvent(req);
    } else if (req.path === "/connect-bank-account-link" && req.method === "GET") {
      const {handleBankConnectionLinkRequest} = await import("./functions/handleBankConnectionLinkRequest");
      body = await handleBankConnectionLinkRequest(req);
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

/*
export const makeuppercase1 = onDocumentCreated("/messages/{documentId}", (event) => {
  if (event.data) {
    return uppercase(event.data);
  }
  return null;
});
export const makeuppercase2 = onDocumentUpdated("/messages/{documentId}", (event) => {
  if (event.data?.after) {
    return uppercase(event.data.after);
  }
  return null;
});
function uppercase(snapshot: DocumentSnapshot) {
  const data = snapshot.data();
  if (!data) return;
  // Grab the current value of what was written to Firestore.
  const original = data.original;

  // Access the parameter `{documentId}` with `event.params`
  logger.log("Uppercasing", snapshot.id, original);

  const uppercase = original.toUpperCase();

  if (uppercase !== data.uppercase) {
    return snapshot.ref.set({uppercase}, {merge: true});
  }
  return null;
}
*/

