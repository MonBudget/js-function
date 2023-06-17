import {TINK_CLIENT_ID, getAccessTokenForUserId, getCodeForTinkLink} from "./auth";
import {getUserProfile} from "./user";

export async function buildTinkLinkForConnectAccounts(params: {
    redirectUri: string,
    externalUserId: string,
    readonly state?: string,
}): Promise<URL> {
  const authorizationCode = await getCodeForTinkLink(params.externalUserId);
  const tinkUserProfile = await getUserProfile(await getAccessTokenForUserId(params.externalUserId, "user:read"));

  const tinkLink = new URL("https://link.tink.com/1.0/transactions/connect-accounts");
  tinkLink.searchParams.append("client_id", TINK_CLIENT_ID);
  tinkLink.searchParams.append("redirect_uri", params.redirectUri);
  tinkLink.searchParams.append("market", tinkUserProfile.market);
  tinkLink.searchParams.append("locale", tinkUserProfile.locale);
  tinkLink.searchParams.append("authorization_code", authorizationCode);
  if (params.state) {
    tinkLink.searchParams.append("state", params.state);
  }
  return tinkLink;
}

export async function buildTinkLinkForCredentialsRefresh(params: {
    redirectUri: string,
    externalUserId: string,
    readonly state?: string,
    credentialsId: string,
}): Promise<URL> {
  const authorizationCode = await getCodeForTinkLink(params.externalUserId);
  const tinkUserProfile = await getUserProfile(await getAccessTokenForUserId(params.externalUserId, "user:read"));

  const tinkLink = new URL("https://link.tink.com/1.0/transactions/update-consent");
  tinkLink.searchParams.append("client_id", TINK_CLIENT_ID);
  tinkLink.searchParams.append("redirect_uri", params.redirectUri);
  tinkLink.searchParams.append("market", tinkUserProfile.market);
  tinkLink.searchParams.append("locale", tinkUserProfile.locale);
  tinkLink.searchParams.append("authorization_code", authorizationCode);
  tinkLink.searchParams.append("credentials_id", params.credentialsId);
  if (params.state) {
    tinkLink.searchParams.append("state", params.state);
  }
  return tinkLink;
}
