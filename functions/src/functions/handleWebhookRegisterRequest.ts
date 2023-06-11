import {Request} from "firebase-functions/v2/https";
import {ResponseEntity, getQueryParam} from "../httpUtils";
import {getAccessToken, registerWebhook} from "../tinkApi";
import {WEBHOOK_PATH} from "./handleTinkWebhookRequest";
import {firestore} from "../firebaseUtils";

export async function handleWebhookRegisterRequest(req: Request): Promise<ResponseEntity<any>> {
  // register webhook
  const baseUrl = getQueryParam(req, "baseUrl");
  // todo: getwebhooks, if baseUrl exists, remove and create a new one
  const accessToken = await getAccessToken("webhook-endpoints");
  const webhook = await registerWebhook(`${baseUrl}${WEBHOOK_PATH}`, accessToken);

  // save webhook in db
  firestore().collection("tink-webhooks").doc(webhook.id).set(webhook);

  return new ResponseEntity(200);
}
