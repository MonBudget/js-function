import {Request} from "firebase-functions/v2/https";
import {getIdToken} from "../firebase/auth";
import {buildTinkLinkForConnectAccounts} from "../tinkApi/tinkLink";


export async function handleBankConnectionLinkRequest(req: Request) {
  const decodedIdToken = await getIdToken(req);
  const userId = decodedIdToken.uid;

  return {
    tinkLink: (await buildTinkLinkForConnectAccounts({
      externalUserId: userId,
      redirectUri: "app://budgit.com/connect-account/callback",
    })).toString(),
  };
}
