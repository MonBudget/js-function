import {Request} from "firebase-functions/v2/https";
import {ResponseEntity, getQueryParam} from "../httpUtils";
import {getAccessToken, getWebhooks, registerWebhook, removeWebhook} from "../tinkApi";
import {WEBHOOK_PATH} from "..";
import {firestore} from "../firebaseUtils";


export async function handleWebhookRegisterRequest(req: Request): Promise<ResponseEntity<undefined>> {
  const baseUrl = getQueryParam(req, "baseUrl");
  const accessToken = await getAccessToken("webhook-endpoints");

  // if webhook already registered on the given baseUrl, remove it
  const existingWebhook = (await getWebhooks(accessToken)).webhookEndpoints.find((webhook) => webhook.url.startsWith(baseUrl));
  if (existingWebhook) {
    await removeWebhook(existingWebhook.id, accessToken);
    await firestore.collection("tink-webhooks").doc(existingWebhook.id).delete();
  }

  // register  webhook for the given baseUrl
  const webhook = await registerWebhook(`${baseUrl}${WEBHOOK_PATH}`, accessToken);
  await firestore.collection("tink-webhooks").doc(webhook.id).set(webhook);

  return new ResponseEntity(200);
}
