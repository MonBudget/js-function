import {Request} from "firebase-functions/v2/https";
import {getIdToken} from "../firebase/auth";
import {buildTinkLinkForCredentialsRefresh} from "../tinkApi/tinkLink";
import {getQueryParam} from "../httpUtils";


export async function handleBankConnectionRefreshRequest(req: Request) {
  const decodedIdToken = await getIdToken(req);
  const userId = decodedIdToken.uid;

  return {
    tinkLink: (await buildTinkLinkForCredentialsRefresh({
      credentialsId: getQueryParam(req, "credentialsId"),
      externalUserId: userId,
      redirectUri: "app://budgit.com/connect-account/callback",
    })).toString(),
  };
}
