import {Request} from "firebase-functions/v2/https";
import {firestore} from "../firebaseUtils";
import {ResponseEntity, ResponseError} from "../httpUtils";

export const WEBHOOK_PATH = "/tink-update-webhook";
const doCheckSignature = false;

export async function handleTinkWebhookRequest(req: Request): Promise<ResponseEntity<any>> {
  const body: {
    content: any;
    webhook: {
      id: string;
      userId: string;
      secret: string;
      url: string;
      clientId: string;
      events: [string];
    };
  } = req.body;

  // store webhook call for debug purpose
  firestore().collection("tink-webhooks").doc(body.webhook.id).collection("calls").add(body.content);

  if (doCheckSignature) {
    await checkSignature(req, body.webhook.id);
  }

  // todo: call tink for corresponding data refreshed
  return new ResponseEntity(200);
}

async function checkSignature(req: Request, webhookId: string) {
  const tinkSignatureHeader = req.header("X-Tink-Signature");
  if (!tinkSignatureHeader) throw new ResponseError(400, "Missing tink signature");
  const keyValues = tinkSignatureHeader.split(",");
  const validKeys = ["t", "v1"];
  const values = keyValues.map((kv) => kv.split("="))
    .filter((kv) => validKeys.includes(kv[0]))
    .flatMap((kv) => kv[1]);
  const timestamp = values[0];
  const signature = values[1];

  const {createHmac} = await import("crypto");
  const secret = (await firestore().collection("tink-webhooks").doc(webhookId).get()).data()?.secret;
  if (!secret) {
    throw new ResponseError(400, "The given webhook id does not exist");
  }
  const computedSignature = createHmac("sha256", secret).update(`${timestamp}.${req.rawBody}`).digest("hex");
  if (signature !== computedSignature) {
    throw new ResponseError(400, "The given signature is wrong");
  }
}
