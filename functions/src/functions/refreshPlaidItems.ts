import {Request} from "firebase-functions/v2/https";
import {checkIdToken} from "../firebase/auth";
import {plaidClient} from "../plaidApi/plaidService";
import {firestore, forEachSnapshotAsync} from "../firebase/firestore";
import * as logger from "firebase-functions/logger";

export async function refreshPlaidItems(req: Request) {
  const {uid: userId} = await checkIdToken(req);

  await forEachSnapshotAsync(firestore.collection("plaid-access-tokens").where("userId", "==", userId), async (accessTokenDoc) => {
    const accessToken = accessTokenDoc.get("accessToken");

    try {
      await plaidClient.transactionsRefresh({access_token: accessToken});
    } catch (error) {
      logger.error("Failed to refresh transactions", error);
    }
  });
}
