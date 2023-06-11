import {fetcheuh} from "./httpUtils";
// import { defineSecret } from "firebase-functions/params";
// const discordApiKey = defineSecret('DISCORD_API_KEY');

const CLIENT_ID = "dcaf323e1ac841da84760a80cd64ad19"; // process.env.REACT_APP_CLIENT_ID;
const CLIENT_SECRET = "915757c3beb64024849231a559546d2c"; // process.env.TINK_CLIENT_SECRET;


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

export async function getWebhooks(accessToken: string): Promise<GetWebhooksResponse> {
  return await fetcheuh("GET", "https://api.tink.com/events/v2/webhook-endpoints", accessToken);
}

type RegisteredWebhook = {
    id: string,
    description: string | undefined,
    enabledEvents: [string],
    disabled: boolean,
    url: boolean,
    createdAt: string,
    updatedAt: string,
    secret: string,
}

export async function registerWebhook(url: string, accessToken: string): Promise<RegisteredWebhook> {
  return await fetcheuh("POST", "https://api.tink.com/events/v2/webhook-endpoints", accessToken, {
    url,
    enabledEvents: [
      "refresh:finished",
      "account:updated",
      "account:created",
      "account-transactions:modified",
    ],
  });
}

type TinkAccessTokenScope = "webhook-endpoints"

export async function getAccessToken(scope: TinkAccessTokenScope | [TinkAccessTokenScope]): Promise<string> {
  const body = new URLSearchParams();
  body.append("client_id", CLIENT_ID);
  body.append("client_secret", CLIENT_SECRET);
  body.append("grant_type", "client_credentials");
  if (scope instanceof Array) {
    body.append("scope", scope.join(","));
  } else {
    body.append("scope", scope);
  }

  return (await fetcheuh<{ access_token: string }>("POST", "https://api.tink.com/api/v1/oauth/token", undefined, body)).access_token;
}
