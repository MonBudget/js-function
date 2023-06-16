import {fetcheuh} from "../httpUtils";
import * as zod from "zod";
// import { defineSecret } from "firebase-functions/params";
// const discordApiKey = defineSecret('DISCORD_API_KEY');

export const TINK_CLIENT_ID = "dcaf323e1ac841da84760a80cd64ad19"; // process.env.REACT_APP_CLIENT_ID;
const TINK_CLIENT_SECRET = "915757c3beb64024849231a559546d2c"; // process.env.TINK_CLIENT_SECRET;


const TinkAccessTokenScopeSchema = zod.enum(["webhook-endpoints",
  "transactions:read",
  "balances:read",
  "accounts:read",
  "credentials:read",
  "credentials:write",
  "credentials:refresh",
  "provider-consents:read",
  "authorization:grant",
  "authorization:read",
  "user:grant",
  "user:read",
  "user:create",
  "user:delete",
  "providers:read"]);

type TinkAccessTokenScope = zod.infer<typeof TinkAccessTokenScopeSchema>

const AuthResponseSchema = zod.object({
  access_token: zod.string(),
});

const AuthGrantResponseSchema = zod.object({
  code: zod.string(),
});

export async function getAccessTokenFromScopes(scopes: TinkAccessTokenScope | TinkAccessTokenScope[]): Promise<string> {
  const body = new URLSearchParams();
  body.append("client_id", TINK_CLIENT_ID);
  body.append("client_secret", TINK_CLIENT_SECRET);
  body.append("grant_type", "client_credentials");
  if (scopes instanceof Array) {
    body.append("scope", scopes.join(","));
  } else {
    body.append("scope", scopes);
  }

  return (await fetcheuh("POST", "https://api.tink.com/api/v1/oauth/token", undefined, body, AuthResponseSchema)).access_token;
}

export async function getAccessTokenFromCode(code: string): Promise<string> {
  const body = new URLSearchParams();
  body.append("client_id", TINK_CLIENT_ID);
  body.append("client_secret", TINK_CLIENT_SECRET);
  body.append("grant_type", "authorization_code");
  body.append("code", code);

  return (await fetcheuh("POST", "https://api.tink.com/api/v1/oauth/token", undefined, body, AuthResponseSchema)).access_token;
}

export async function getAuthorizationGrantCode(externalUserId: string, scopes: TinkAccessTokenScope | TinkAccessTokenScope[], accessToken: string): Promise<string> {
  const body = new URLSearchParams();
  body.append("external_user_id", externalUserId);
  if (scopes instanceof Array) {
    body.append("scope", scopes.join(","));
  } else {
    body.append("scope", scopes);
  }

  return (await fetcheuh("POST", "https://api.tink.com/api/v1/oauth/authorization-grant", accessToken, body, AuthGrantResponseSchema)).code;
}

export async function getAuthorizationGrantDelegateCode(externalUserId: string, scopes: TinkAccessTokenScope | TinkAccessTokenScope[], accessToken: string): Promise<string> {
  const body = new URLSearchParams();
  body.append("external_user_id", externalUserId);
  body.append("id_hint", "Budg'it");
  body.append("actor_client_id", "df05e4b379934cd09963197cc855bfe9");
  if (scopes instanceof Array) {
    body.append("scope", scopes.join(","));
  } else {
    body.append("scope", scopes);
  }

  return (await fetcheuh("POST", "https://api.tink.com/api/v1/oauth/authorization-grant/delegate", accessToken, body, AuthGrantResponseSchema)).code;
}

export async function getAccessTokenForUserId(externalUserId: string, scopes: TinkAccessTokenScope | TinkAccessTokenScope[]): Promise<string> {
  const authGrantToken = await getAccessTokenFromScopes("authorization:grant");
  const code = await getAuthorizationGrantCode(externalUserId, scopes, authGrantToken);
  return getAccessTokenFromCode(code);
}

export async function getCodeForTinkLink(externalUserId: string): Promise<string> {
  const authGrantToken = await getAccessTokenFromScopes("authorization:grant");
  const scopes: TinkAccessTokenScope[] = [
    "authorization:read",
    "credentials:refresh",
    "credentials:read",
    "credentials:write",
    "providers:read",
    "user:read",
  ];
  const code = await getAuthorizationGrantDelegateCode(externalUserId, scopes, authGrantToken);
  return code;
}
