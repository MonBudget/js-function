import {Request} from "firebase-functions/v2/https";
import {ResponseError, fetcheuh} from "../httpUtils";


export function getWebhooks(accessToken: string): Promise<GetWebhooksResponse> {
  return fetcheuh("GET", "https://api.tink.com/events/v2/webhook-endpoints", accessToken);
}

export function registerWebhook(url: string, accessToken: string, enabledEvents: WebhookEventType[]): Promise<RegisteredWebhook> {
  return fetcheuh("POST", "https://api.tink.com/events/v2/webhook-endpoints", accessToken, {
    url,
    enabledEvents,
  });
}

export function removeWebhook(webhookId: string, accessToken: string): Promise<RegisteredWebhook> {
  return fetcheuh("DELETE", `https://api.tink.com/events/v2/webhook-endpoints/${webhookId}`, accessToken);
}

export async function checkTinkEventSignature(req: Request, secret: string) {
  const tinkSignatureHeader = req.header("X-Tink-Signature");
  if (!tinkSignatureHeader) throw new ResponseError(400, "Missing signature");
  const parsedHeader: {timestamp: string|undefined, signature: string|undefined} = {
    timestamp: undefined,
    signature: undefined,
  };
  tinkSignatureHeader.split(",").forEach((kv) =>{
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

  const {createHmac} = await import("crypto");
  const computedSignature = createHmac("sha256", secret).update(`${parsedHeader.timestamp}.${req.rawBody}`).digest("hex");
  if (parsedHeader.signature !== computedSignature) {
    throw new ResponseError(400, "Bad signature");
  }
}

type GetWebhooksResponse = {
  webhookEndpoints: [
      {
          id: string,
          enabledEvents: [string],
          disabled: boolean,
          url: string,
          createdAt: string,
          updatedAt: string,
      }
  ]
}

export type RegisteredWebhook = {
    id: string,
    description: string | undefined,
    enabledEvents: [string],
    disabled: boolean,
    url: boolean,
    createdAt: string,
    updatedAt: string,
    secret: string,
}

export type WebhookEventType = "refresh:finished"
                             | "account:updated"
                             | "account:created"
                             | "account-transactions:modified"
                             | "account-booked-transactions:modified"

type BaseTinkEvent = {
  context: {
    userId: string,
    externalUserId: string,
  },
}

type AccountCreatedEvent = BaseTinkEvent & {
  content: {
    id: string
  },
  event: "account:created"
}

type AccountUpdatedEvent = BaseTinkEvent & {
  content: {
    id: string
  },
  event: "account:updated"
}

type AccountTransactionsModifiedEvent = BaseTinkEvent & {
  content: {
    account: {
      id: string
    }
  },
  event: "account-transactions:modified"
}

type AccountBookedTransactionsModifiedEvent = BaseTinkEvent & {
  content: {
    account: {
      id: string
      transactionsModifiedEarliestBookedDate: string
    }
  },
  event: "account-booked-transactions:modified"
}

type RefreshFinishedEvent = BaseTinkEvent & {
  content: {
    credentialsId: string,
    credentialsStatus: "UPDATED" | "TEMPORARY_ERROR" | "AUTHENTICATION_ERROR" | "SESSION_EXPIRED",
    finished: number, // ts in milliseconds
    source: "OPERATION_SOURCE_API" | "OPERATION_SOURCE_BACKGROUND" | "OPERATION_SOURCE_STREAMING" | undefined,
    sessionExpiryDate: 0 | number | undefined // ts in milliseconds
    detailedError: {
      type: string,
      displayMessage: string,
      details: {
        "reason" : string,
        "retryable" : boolean
      }
    } | undefined
  },
  event: "refresh:finished"
}

export type TinkEvent = AccountCreatedEvent | AccountUpdatedEvent | AccountTransactionsModifiedEvent | AccountBookedTransactionsModifiedEvent | RefreshFinishedEvent
