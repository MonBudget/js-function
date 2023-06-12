import {Request} from "firebase-functions/v2/https";
import {auth} from "../firebase/auth";
import {ResponseError} from "../httpUtils";
import {DecodedIdToken} from "firebase-admin/auth";
import {buildTinkLinkForConnectAccounts} from "../tinkApi/tinkLink";


export async function handleBankConnectionLinkRequest(req: Request) {
  const authorization = req.headers.authorization;
  let decodedIdToken: DecodedIdToken;
  if (authorization && authorization.startsWith("Bearer ")) {
    const idToken = authorization.substring(7);
    decodedIdToken = await auth.verifyIdToken(idToken, true);
  } else {
    throw new ResponseError(401, "Unauthorized");
  }
  const userId = decodedIdToken.uid;

  return {
    tinkLink: (await buildTinkLinkForConnectAccounts({
      externalUserId: userId,
      locale: "fr_FR",
      market: "FR",
      redirectUri: "app://budgit.com/connect-account/callback",
      state: undefined,
    })).toString(),
  };
}
