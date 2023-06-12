import {Request} from "firebase-functions/v2/https";
import {ResponseError, getQueryParam} from "../httpUtils";
import {WEBHOOK_PATH} from "../index";
import {firestore} from "../firebase/firestore";
import {getAccessTokenFromScopes} from "../tinkApi/auth";
import {getWebhooks, registerWebhook, removeWebhook} from "../tinkApi/webhook";


export async function handleWebhookRegisterRequest(req: Request) {
  // todo: add admin authentication
  let baseUrl = getQueryParam(req, "baseUrl");
  if (!baseUrl.startsWith("https://")) throw new ResponseError(400, "'baseUrl' must be an https url");
  while (baseUrl.endsWith("/")) baseUrl = baseUrl.substring(0, baseUrl.length - 1);

  const accessToken = await getAccessTokenFromScopes("webhook-endpoints");

  // if webhook already registered on the given baseUrl, remove it
  const existingWebhook = (await getWebhooks(accessToken)).webhookEndpoints.find((webhook) => webhook.url.startsWith(baseUrl));
  if (existingWebhook) {
    await removeWebhook(existingWebhook.id, accessToken);
    await firestore.collection("tink-webhooks").doc(existingWebhook.id).delete();
  }

  // register  webhook for the given baseUrl
  const webhook = await registerWebhook(
    `${baseUrl}${WEBHOOK_PATH}`,
    accessToken,
    [
      "account-transactions:modified",
      "account-booked-transactions:modified",
      "refresh:finished",
      "account:updated",
      "account:created",
    ]
  );
  await firestore.collection("tink-webhooks").doc(webhook.id).set(webhook);
}
