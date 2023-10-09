import * as logger from "firebase-functions/logger";
import {getAccessTokenForExternalUserId} from "../tinkApi/auth";
import {firestore, recursiveDelete} from "../firebase/firestore";
import {FieldPath, Filter} from "firebase-admin/firestore";
import {Request} from "firebase-functions/lib/v2/providers/https";
import {checkIdToken} from "../firebase/auth";
import {getQueryParam} from "../shared/httpUtils";
import {removeCredentials} from "../tinkApi/credentials";
import {ClientResponseError, ResponseError} from "../shared/ResponseError";
import {plaidClient} from "../plaidApi/plaidService";

export async function handleBankCredentialsDelete(req: Request) {
  const decodedIdToken = await checkIdToken(req);
  const userId = decodedIdToken.uid;
  const credentialsId = getQueryParam(req, "credentialsId");

  logger.info(`Deleting bank credentials ${credentialsId} for userId ${userId}`);

  try {
    const result = await removeCredentials({
      accessToken: await getAccessTokenForExternalUserId(userId, "credentials:write"),
      credentialsId,
    });

    logger.info(`Removed tink credentials ${credentialsId} success`, result.__originalPayload__);
  } catch (error) {
    if (error instanceof ClientResponseError && error.responseCode == 404) {
      logger.warn(`Tink credentials ${credentialsId} not found, might be an anonymous connection`);
    } else throw error;
  }

  try {
    const accessTokenDoc = await firestore.collection("plaid-access-tokens").doc(credentialsId).get();
    const accessToken = accessTokenDoc.get("accessToken");
    logger.info(`Removing plaid item ${credentialsId} with accesToken ${accessToken}`);
    const result = await plaidClient.itemRemove({
      access_token: accessToken,
    });
    await firestore.collection("plaid-access-tokens").doc(credentialsId).delete();

    logger.info(`Removed plaid item ${credentialsId} success`, result.data);
  } catch (error) {
    logger.warn(`Plaid item ${credentialsId} not removed`, error);
  }

  const document = (await firestore.collection("bankCredentials")
    .where(FieldPath.documentId(), "==", credentialsId)
    .where("userId", "==", userId)
    .limit(1)
    .get()).docs.at(0);

  if (!document) throw new ResponseError(400, "Invalid request");

  await firestore.collection("bankCredentials").doc(credentialsId).delete();

  const bulkWriter = firestore.bulkWriter();

  const accountIds: string[] = document.data().accountIds;

  logger.info(`Account ids to delete for bank credentials ${credentialsId} for userId ${userId}: ${accountIds}`);

  for (const accountId of accountIds) {
    const number = await firestore.collection("bankCredentials")
      .where("accountIds", "array-contains", accountId)
      .where(Filter.where("userId", "==", userId))
      .count()
      .get();

    if (number.data().count == 0) {
      await recursiveDelete(firestore.collection("bankAccounts").doc(accountId), bulkWriter);
    }
  }

  await bulkWriter.close();

  logger.info(`Account ids to delete for bank credentials ${credentialsId} for userId ${userId} finished`);
}
