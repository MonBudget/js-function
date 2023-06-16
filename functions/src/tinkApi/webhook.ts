import {Request} from "firebase-functions/v2/https";
import {ResponseError, fetcheuh} from "../httpUtils";
import * as logger from "firebase-functions/logger";
import * as zod from "zod";


export function getWebhooks(accessToken: string) {
  return fetcheuh("GET", "https://api.tink.com/events/v2/webhook-endpoints", accessToken, undefined, GetWebhooksResponseSchema);
}

export function registerWebhook(url: string, accessToken: string, enabledEvents: WebhookEventType[]) {
  return fetcheuh("POST", "https://api.tink.com/events/v2/webhook-endpoints", accessToken, {
    url,
    enabledEvents,
  }, RegisteredWebhookSchema);
}

export async function removeWebhook(webhookId: string, accessToken: string) {
  await fetcheuh("DELETE", `https://api.tink.com/events/v2/webhook-endpoints/${webhookId}`, accessToken, undefined, zod.any().optional());
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
    logger.error(`Badly formatted signature header. raw: '${tinkSignatureHeader}'. Parsed signature in jsonPayload`, parsedHeader);
    throw new ResponseError(400, "Bad signature");
  }

  const {createHmac} = await import("crypto");
  const computedSignature = createHmac("sha256", secret).update(`${parsedHeader.timestamp}.${req.rawBody}`).digest("hex");
  if (parsedHeader.signature !== computedSignature) {
    throw new ResponseError(400, "Bad signature");
  }
}

const WebhookEventTypeSchema = zod.enum(["refresh:finished",
  "account:updated",
  "account:created",
  "account-transactions:modified",
  "account-booked-transactions:modified"]);
export type WebhookEventType = zod.infer<typeof WebhookEventTypeSchema>

const GetWebhooksResponseSchema = zod.object({
  webhookEndpoints: zod.array(zod.object({
    id: zod.string(),
    description: zod.string().optional(),
    enabledEvents: zod.array(WebhookEventTypeSchema),
    disabled: zod.boolean(),
    url: zod.string().url(),
    createdAt: zod.string(),
    updatedAt: zod.string(),
  })),
});

const RegisteredWebhookSchema = zod.object({
  id: zod.string(),
  description: zod.string().optional(),
  enabledEvents: zod.array(WebhookEventTypeSchema),
  disabled: zod.boolean(),
  url: zod.string().url(),
  createdAt: zod.string(),
  updatedAt: zod.string(),
  secret: zod.string(),
});
export type RegisteredWebhook = zod.infer<typeof RegisteredWebhookSchema>

const BaseTinkEventSchema = zod.object({
  context: zod.object({
    userId: zod.string(),
    externalUserId: zod.string(), // Normally optional, but we are always givin the firebase uid as the externalUserId
  }),
});

const AccountCreatedEventSchema = BaseTinkEventSchema.extend({
  event: zod.literal("account:created"),
  content: zod.object({
    id: zod.string(),
  }),
});
export type AccountCreatedEvent = zod.infer<typeof AccountCreatedEventSchema>

const AccountUpdatedEventSchema = BaseTinkEventSchema.extend({
  event: zod.literal("account:updated"),
  content: zod.object({
    id: zod.string(),
  }),
});
export type AccountUpdatedEvent = zod.infer<typeof AccountUpdatedEventSchema>

const AccountTransactionsModifiedEventSchema = BaseTinkEventSchema.extend({
  event: zod.literal("account-transactions:modified"),
  content: zod.object({
    account: zod.object({
      id: zod.string(),
    }),
  }),
});
export type AccountTransactionsModifiedEvent = zod.infer<typeof AccountTransactionsModifiedEventSchema>

const AccountBookedTransactionsModifiedEventSchema = BaseTinkEventSchema.extend({
  event: zod.literal("account-booked-transactions:modified"),
  content: zod.object({
    account: zod.object({
      id: zod.string(),
      transactionsModifiedEarliestBookedDate: zod.string(),
    }),
  }),
});
export type AccountBookedTransactionsModifiedEvent = zod.infer<typeof AccountBookedTransactionsModifiedEventSchema>

const RefreshFinishedEventSchema = BaseTinkEventSchema.extend({
  event: zod.literal("refresh:finished"),
  content: zod.object({
    credentialsId: zod.string(),
    credentialsStatus: zod.enum(["UPDATED", "TEMPORARY_ERROR", "AUTHENTICATION_ERROR", "SESSION_EXPIRED"]),
    finished: zod.number(),
    source: zod.enum(["OPERATION_SOURCE_API", "OPERATION_SOURCE_BACKGROUND", "OPERATION_SOURCE_STREAMING"]).optional(),
    sessionExpiryDate: zod.union([zod.literal(0), zod.number()]).optional(),
    detailedError: zod.object({
      type: zod.string(),
      displayMessage: zod.string(),
      details: zod.object({
        reason: zod.string(),
        retryable: zod.boolean(),
      }),
    }).optional(),
  }),
});
export type RefreshFinishedEvent = zod.infer<typeof RefreshFinishedEventSchema>

const TinkEventSchema = zod.discriminatedUnion("event", [
  AccountCreatedEventSchema,
  AccountUpdatedEventSchema,
  AccountTransactionsModifiedEventSchema,
  AccountBookedTransactionsModifiedEventSchema,
  RefreshFinishedEventSchema,
]);

export type TinkEvent = zod.infer<typeof TinkEventSchema>
