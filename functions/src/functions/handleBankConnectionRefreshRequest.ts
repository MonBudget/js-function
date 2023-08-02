import {Request} from "firebase-functions/v2/https";
import {checkIdToken} from "../firebase/auth";
import {buildTinkLinkForCredentialsRefresh} from "../tinkApi/tinkLink";
import {getQueryParam} from "../shared/httpUtils";


export async function handleBankConnectionRefreshRequest(req: Request) {
  const decodedIdToken = await checkIdToken(req);
  const userId = decodedIdToken.uid;
  const redirectUri = getQueryParam(req, "redirectUri");
  const market = getQueryParam(req, "country");
  const locale = getQueryParam(req, "locale");
  const credentialsId = getQueryParam(req, "credentialsId");

  return {
    tinkLink: (await buildTinkLinkForCredentialsRefresh({
      credentialsId,
      market,
      locale,
      externalUserId: userId,
      redirectUri,
    })).toString(),
  };
}
