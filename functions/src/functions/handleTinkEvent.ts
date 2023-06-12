import {Request} from "firebase-functions/v2/https";
import {firestore} from "../firebase/firestore";
import {ResponseError} from "../httpUtils";
import * as logger from "firebase-functions/logger";
import {RegisteredWebhook, TinkEvent, checkTinkEventSignature} from "../tinkApi/webhook";
import {getAccessTokenForUserId} from "../tinkApi/auth";
import {getAccount} from "../tinkApi/account";


export async function handleTinkEvent(req: Request) {
  const event: TinkEvent = req.body;

  try {
    const webhook = (await firestore.collection("tink-webhooks")
      .where("enabledEvents", "array-contains", event.event)
      .limit(1).get())
      .docs.at(0)?.data() as (RegisteredWebhook | undefined);
    const secret = webhook?.secret;
    logger.info(`Found webhook ${webhook?.id} for ${event.event}`);
    if (!secret) {
      logger.warn(`No secret found for ${event.event}`);
      throw new ResponseError(400, "The given webhook id does not exist");
    }
    await checkTinkEventSignature(req, secret);
    logger.info("Tink signature: OK");
  } catch (error) {
    logger.error("Tink signature: ERROR", error);
  }

  await processEvent(event);
}

async function processEvent(event: TinkEvent) {
  switch (event.event) {
  case "refresh:finished":
    // fetch and store creds, find duplicates to unify connections like backend
    break;
  case "account:updated": case "account:created": {
    const account = await getAccount(event.content.id, await getAccessTokenForUserId(event.context.externalUserId, "accounts:read"));
    await firestore.collection("bankAccounts").doc(account.id).set({
      fromTink: account,
      userId: event.context.externalUserId,
    }, {mergeFields: ["fromTink", "userId"]});
    break;
  }
  case "account-transactions:modified":
    // how to retrieve transactions ? past month ? current day ?
    break;
  case "account-booked-transactions:modified":
    // fetch and store transactions while querying with the event.content.account.transactionsModifiedEarliestBookedDate
    break;
  default:
    logger.error("Received an unknown tink event", event);
    break;
  }
}
