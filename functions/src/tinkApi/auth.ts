import {fetcheuh} from "../shared/httpUtils";
import * as zod from "zod";
import {getTinkClientId, getTinkClientSecret} from "../vars";


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
  "providers:read",
]);

type TinkAccessTokenScope = zod.infer<typeof TinkAccessTokenScopeSchema>

const AuthResponseSchema = zod.object({
  access_token: zod.string(),
});

const AuthGrantResponseSchema = zod.object({
  code: zod.string(),
});

export async function getAccessTokenFromScopes(scopes: TinkAccessTokenScope | TinkAccessTokenScope[]): Promise<string> {
  const body = new URLSearchParams();
  body.append("client_id", getTinkClientId());
  body.append("client_secret", getTinkClientSecret());
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
  body.append("client_id", getTinkClientId());
  body.append("client_secret", getTinkClientSecret());
  body.append("grant_type", "authorization_code");
  body.append("code", code);

  return (await fetcheuh("POST", "https://api.tink.com/api/v1/oauth/token", undefined, body, AuthResponseSchema)).access_token;
}

export async function getAuthorizationGrantCodeForExternalUserId(
  externalUserId: string,
  scopes: TinkAccessTokenScope | TinkAccessTokenScope[],
  accessToken: string
): Promise<string> {
  const body = new URLSearchParams();
  body.append("external_user_id", externalUserId);
  if (scopes instanceof Array) {
    body.append("scope", scopes.join(","));
  } else {
    body.append("scope", scopes);
  }

  return (await fetcheuh("POST", "https://api.tink.com/api/v1/oauth/authorization-grant", accessToken, body, AuthGrantResponseSchema)).code;
}

export async function getAuthorizationGrantCodeForTinkUserId(
  userId: string,
  scopes: TinkAccessTokenScope | TinkAccessTokenScope[],
  accessToken: string
): Promise<string> {
  const body = new URLSearchParams();
  body.append("user_id", userId);
  if (scopes instanceof Array) {
    body.append("scope", scopes.join(","));
  } else {
    body.append("scope", scopes);
  }

  return (await fetcheuh("POST", "https://api.tink.com/api/v1/oauth/authorization-grant", accessToken, body, AuthGrantResponseSchema)).code;
}

export async function getAuthorizationGrantDelegateCodeForExternalUserId(
  externalUserId: string,
  scopes: TinkAccessTokenScope | TinkAccessTokenScope[],
  accessToken: string
): Promise<string> {
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

export async function getAccessTokenForExternalUserId(externalUserId: string, scopes: TinkAccessTokenScope | TinkAccessTokenScope[]): Promise<string> {
  const authGrantToken = await getAccessTokenFromScopes("authorization:grant");
  const code = await getAuthorizationGrantCodeForExternalUserId(externalUserId, scopes, authGrantToken);
  return getAccessTokenFromCode(code);
}

export async function getAccessTokenForTinkUserId(tinkUserId: string, scopes: TinkAccessTokenScope | TinkAccessTokenScope[]): Promise<string> {
  const authGrantToken = await getAccessTokenFromScopes("authorization:grant");
  const code = await getAuthorizationGrantCodeForTinkUserId(tinkUserId, scopes, authGrantToken);
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
  const code = await getAuthorizationGrantDelegateCodeForExternalUserId(externalUserId, scopes, authGrantToken);
  return code;
}
