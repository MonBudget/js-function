import {TINK_CLIENT_ID, getCodeForTinkLink} from "./auth";

export async function buildTinkLinkForConnectAccounts(params: {
    redirectUri: string,
    market: string,
    locale: string,
    externalUserId: string,
    state: string | undefined,
}): Promise<URL> {
  const authorizationCode = await getCodeForTinkLink(params.externalUserId);

  const tinkLink = new URL("https://link.tink.com/1.0/transactions/connect-accounts");
  tinkLink.searchParams.append("client_id", TINK_CLIENT_ID);
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
    market: string,
    locale: string,
    externalUserId: string,
    state: string | undefined,
    credentialsId: string,
}): Promise<URL> {
  const authorizationCode = await getCodeForTinkLink(params.externalUserId);

  const tinkLink = new URL("https://link.tink.com/1.0/transactions/update-consent");
  tinkLink.searchParams.append("client_id", TINK_CLIENT_ID);
  tinkLink.searchParams.append("redirect_uri", params.redirectUri);
  tinkLink.searchParams.append("market", params.market);
  tinkLink.searchParams.append("locale", params.locale);
  tinkLink.searchParams.append("authorization_code", authorizationCode);
  tinkLink.searchParams.append("credentials_id", authorizationCode);
  if (params.state) {
    tinkLink.searchParams.append("state", params.state);
  }
  return tinkLink;
}
