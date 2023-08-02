import {Request} from "firebase-functions/v2/https";
import {WEBHOOK_PATH} from "../index";
import {firestore} from "../firebase/firestore";
import {getAccessTokenFromScopes} from "../tinkApi/auth";
import {getWebhooks, registerWebhook, removeWebhook} from "../tinkApi/webhook";


export async function handleWebhookRegisterRequest(req: Request) {
  // todo: add admin authentication
  const baseUrl = `https://${req.hostname}`;

  const accessToken = await getAccessTokenFromScopes("webhook-endpoints");

  // if webhook already registered on the given baseUrl, remove it
  const existingWebhooks = (await getWebhooks(accessToken)).webhookEndpoints.filter((webhook) => webhook.url.startsWith(baseUrl));
  for (const existingWebhook of existingWebhooks) {
    await removeWebhook(existingWebhook.id, accessToken);
    await firestore.collection("tink-webhooks").doc(existingWebhook.id).delete();
  }

  // register  webhook for the given baseUrl
  const webhook = await registerWebhook(
    `${baseUrl}/onTinkEvent${WEBHOOK_PATH}`,
    accessToken,
    [
      "account-transactions:modified",
      "account-booked-transactions:modified",
      "refresh:finished",
      "account:updated",
      // "account:created", already receiving account:updated
    ]
  );
  await firestore.collection("tink-webhooks").doc(webhook.id).set(webhook);
}
