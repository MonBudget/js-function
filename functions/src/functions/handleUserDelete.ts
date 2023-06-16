import * as logger from "firebase-functions/logger";
import {deleteUser} from "../tinkApi/user";
import {getAccessTokenForUserId} from "../tinkApi/auth";
import {UserRecord} from "firebase-functions/v1/auth";
import {firestore} from "../firebase/firestore";
import {Filter} from "firebase-admin/firestore";


export async function handleUserDelete(event: UserRecord) {
  logger.info(`Deleting user ${event.uid}`, event);
  await deleteUser(await getAccessTokenForUserId(event.uid, "user:delete"));
  await firestore.collection("userProfiles").doc(event.uid).delete();
  const bulkWriter = firestore.bulkWriter();
  for (const doc of (await firestore.collection("expenses").where(Filter.where("userId", "==", event.uid)).get()).docs) {
    void bulkWriter.delete(doc.ref);
  }
  for (const doc of (await firestore.collection("bankAccounts").where(Filter.where("userId", "==", event.uid)).get()).docs) {
    void bulkWriter.delete(doc.ref);
  }
  await bulkWriter.close();
}
