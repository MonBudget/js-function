import * as logger from "firebase-functions/logger";
import {deleteUser} from "../tinkApi/user";
import {getAccessTokenForUserId} from "../tinkApi/auth";
import {UserRecord} from "firebase-functions/v1/auth";
import {firestore, removeDocumentsRecursively} from "../firebase/firestore";
import {Filter} from "firebase-admin/firestore";


export async function handleUserDelete(event: UserRecord) {
  await doDeleteUser(event.uid);
}

export async function doDeleteUser(userId: string) {
  logger.info(`Deleting user ${userId}`);
  try {
    await deleteUser(await getAccessTokenForUserId(userId, "user:delete"));
  } catch (e) {
    logger.warn("Error while removing the tink user", e);
  }
  await firestore.collection("userProfiles").doc(userId).delete();
  const bulkWriter = firestore.bulkWriter();
  await removeDocumentsRecursively(firestore.collection("expenses").where(Filter.where("userId", "==", userId)), bulkWriter);
  await removeDocumentsRecursively(firestore.collection("bankAccounts").where(Filter.where("userId", "==", userId)), bulkWriter);
  await removeDocumentsRecursively(firestore.collection("bankCredentials").where(Filter.where("userId", "==", userId)), bulkWriter);
  await bulkWriter.close();
}
