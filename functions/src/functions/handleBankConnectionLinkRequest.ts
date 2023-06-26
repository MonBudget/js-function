import {Request} from "firebase-functions/v2/https";
import {getIdToken} from "../firebase/auth";
import {buildTinkLinkForConnectAccounts} from "../tinkApi/tinkLink";
import {getQueryParam} from "../shared/httpUtils";


export async function handleBankConnectionLinkRequest(req: Request) {
  const decodedIdToken = await getIdToken(req);
  const userId = decodedIdToken.uid;
  const redirectUri = getQueryParam(req, "redirectUri");

  return {
    tinkLink: (await buildTinkLinkForConnectAccounts({
      externalUserId: userId,
      redirectUri: redirectUri,
    })).toString(),
  };
}
