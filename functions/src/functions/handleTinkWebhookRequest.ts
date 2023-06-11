import {Request} from "firebase-functions/v2/https";
import {firestore} from "../firebaseUtils";
import {ResponseEntity, ResponseError, getQueryParam} from "../httpUtils";


export async function handleTinkWebhookRequest(req: Request): Promise<ResponseEntity<undefined>> {
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

  const bypassSignature = getQueryParam(req, "bypassSignature", "true");

  // store webhook call for debug purpose
  await firestore.collection("tink-webhooks").doc(body.webhook.id).collection("calls").add(body.content);

  if (bypassSignature !== "true") {
    await checkSignature(req, body.webhook.id);
  }

  // todo: call tink for corresponding data to be refreshed
  return new ResponseEntity(200);
}

async function checkSignature(req: Request, webhookId: string) {
  const tinkSignatureRawHeader = req.header("X-Tink-Signature");
  if (!tinkSignatureRawHeader) throw new ResponseError(400, "Missing signature");
  const parsedHeader: {timestamp: string|undefined, signature: string|undefined} = {
    timestamp: undefined,
    signature: undefined,
  };
  tinkSignatureRawHeader.split(",").forEach((kv) =>{
    const [key, value] = kv.split("=");
    switch (key) {
    case "t":
      parsedHeader.timestamp = value;
      break;
    case "v1":
      parsedHeader.signature = value;
      break;
    }
  });

  if (parsedHeader.timestamp === undefined || parsedHeader.signature === undefined) {
    throw new ResponseError(400, "Bad signature");
  }

  const secret = (await firestore.collection("tink-webhooks").doc(webhookId).get()).data()?.secret;
  if (!secret) {
    throw new ResponseError(400, "The given webhook id does not exist");
  }
  const {createHmac} = await import("crypto");
  const computedSignature = createHmac("sha256", secret).update(`${parsedHeader.timestamp}.${req.rawBody}`).digest("hex");
  if (parsedHeader.signature !== computedSignature) {
    throw new ResponseError(400, "Bad signature");
  }
}
