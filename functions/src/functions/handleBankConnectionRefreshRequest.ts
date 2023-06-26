import {Request} from "firebase-functions/v2/https";
import {getIdToken} from "../firebase/auth";
import {buildTinkLinkForCredentialsRefresh} from "../tinkApi/tinkLink";
import {getQueryParam} from "../shared/httpUtils";


export async function handleBankConnectionRefreshRequest(req: Request) {
  const decodedIdToken = await getIdToken(req);
  const userId = decodedIdToken.uid;
  const redirectUri = getQueryParam(req, "redirectUri");

  return {
    tinkLink: (await buildTinkLinkForCredentialsRefresh({
      credentialsId: getQueryParam(req, "credentialsId"),
      externalUserId: userId,
      redirectUri: redirectUri,
    })).toString(),
  };
}
