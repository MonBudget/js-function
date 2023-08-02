import {Request} from "firebase-functions/v2/https";
import {checkIdToken} from "../firebase/auth";
import {buildTinkLinkForConnectAccounts, buildTinkLinkForOneTimeConnectAccounts} from "../tinkApi/tinkLink";
import {getQueryParam} from "../shared/httpUtils";
import {getAccessTokenFromScopes} from "../tinkApi/auth";
import {firestore} from "../firebase/firestore";


export async function handleBankConnectionLinkRequest(req: Request) {
  const decodedIdToken = await checkIdToken(req);
  const userId = decodedIdToken.uid;
  const redirectUri = getQueryParam(req, "redirectUri");
  const market = getQueryParam(req, "country");
  const locale = getQueryParam(req, "locale");

  let inAnonymous: boolean;
  try {
    await getAccessTokenFromScopes("user:create");
    inAnonymous = false;
  } catch (error) {
    inAnonymous = true;
  }

  if (inAnonymous) {
    const tinkLink = await buildTinkLinkForOneTimeConnectAccounts({
      redirectUri,
      market,
      locale,
    });
    await firestore.collection("anonymousTinkUsers").doc(tinkLink.anonymousUserId).create({
      firebaseUserId: decodedIdToken.uid,
      tinkUserId: tinkLink.anonymousUserId,
    });

    return {
      tinkLink: tinkLink.tinkLinkUrl.toString(),
    };
  }

  return {
    tinkLink: (await buildTinkLinkForConnectAccounts({
      externalUserId: userId,
      redirectUri,
      market,
      locale,
    })).toString(),
  };
}
