import {Request} from "firebase-functions/v2/https";
import {checkIdToken} from "../firebase/auth";
import {plaidClient, savePlaidAccounts, savePlaidItem} from "../plaidApi/plaidService";
import {firestore} from "../firebase/firestore";
import {logger} from "firebase-functions/v2";

export async function registerPlaidLinkPublicToken(req: Request) {
  const {uid: userId} = await checkIdToken(req);

  const {data: {publicToken}}: {data: {publicToken: string}} = req.body;

  const {data: {access_token: accessToken, item_id: itemId}} = await plaidClient.itemPublicTokenExchange({public_token: publicToken});

  await firestore.collection("plaid-access-tokens").doc(itemId).set({
    itemId,
    userId,
    accessToken,
  }, {merge: true});

  try {
    await plaidClient.transactionsRefresh({access_token: accessToken});
  } catch (error) {
    logger.warn("transactions refresh failed", error);
  }

  await savePlaidItem({accessToken, userId});
  await savePlaidAccounts({accessToken, userId});
}
