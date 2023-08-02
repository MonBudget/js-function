import {getTinkClientId} from "../vars";
import {getCodeForTinkLink} from "./auth";
import {createAnonymousUser} from "./user";

export async function buildTinkLinkForConnectAccounts(params: {
  redirectUri: string,
  externalUserId: string,
  market: string,
  locale: string,
  readonly state?: string,
}): Promise<URL> {
  const authorizationCode = await getCodeForTinkLink(params.externalUserId);

  const tinkLink = new URL("https://link.tink.com/1.0/transactions/connect-accounts");
  tinkLink.searchParams.append("client_id", getTinkClientId());
  tinkLink.searchParams.append("redirect_uri", params.redirectUri);
  tinkLink.searchParams.append("market", params.market);
  tinkLink.searchParams.append("locale", params.locale);
  tinkLink.searchParams.append("authorization_code", authorizationCode);
  if (params.state) {
    tinkLink.searchParams.append("state", params.state);
  }
  return tinkLink;
}

export async function buildTinkLinkForCredentialsRefresh(params: {
  redirectUri: string,
  externalUserId: string,
  market: string,
  locale: string,
  readonly state?: string,
  credentialsId: string,
}): Promise<URL> {
  const authorizationCode = await getCodeForTinkLink(params.externalUserId);

  const tinkLink = new URL("https://link.tink.com/1.0/transactions/update-consent");
  tinkLink.searchParams.append("client_id", getTinkClientId());
  tinkLink.searchParams.append("redirect_uri", params.redirectUri);
  tinkLink.searchParams.append("market", params.market);
  tinkLink.searchParams.append("locale", params.locale);
  tinkLink.searchParams.append("authorization_code", authorizationCode);
  tinkLink.searchParams.append("credentials_id", params.credentialsId);
  if (params.state) {
    tinkLink.searchParams.append("state", params.state);
  }
  return tinkLink;
}

export async function buildTinkLinkForOneTimeConnectAccounts(params: {
  redirectUri: string,
  market: string,
  locale: string,
  readonly state?: string,
}) {
  const anonymousUser = await createAnonymousUser({market: params.market, locale: params.locale});

  const tinkLink = new URL("https://link.tink.com/1.0/transactions/connect-accounts");
  tinkLink.searchParams.append("client_id", getTinkClientId());
  tinkLink.searchParams.append("redirect_uri", params.redirectUri);
  tinkLink.searchParams.append("market", params.market);
  tinkLink.searchParams.append("locale", params.locale);
  tinkLink.searchParams.append("authorization_token", anonymousUser.access_token);
  if (params.state) {
    tinkLink.searchParams.append("state", params.state);
  }
  return {
    anonymousUserId: anonymousUser.user.id,
    tinkLinkUrl: tinkLink,
  };
}
