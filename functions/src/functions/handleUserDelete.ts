import * as logger from "firebase-functions/logger";
import {deleteUser} from "../tinkApi/user";
import {getAccessTokenForUserId} from "../tinkApi/auth";
import {UserRecord} from "firebase-functions/v1/auth";
import {firestore} from "../firebase/firestore";
import {BulkWriter, DocumentReference, Filter, Query} from "firebase-admin/firestore";


export async function handleUserDelete(event: UserRecord) {
  logger.info(`Deleting user ${event.uid}`, event);
  await deleteUser(await getAccessTokenForUserId(event.uid, "user:delete"));
  await firestore.collection("userProfiles").doc(event.uid).delete();
  const bulkWriter = firestore.bulkWriter();
  await removeDocumentsRecursively(firestore.collection("expenses").where(Filter.where("userId", "==", event.uid)), bulkWriter);
  await removeDocumentsRecursively(firestore.collection("bankAccounts").where(Filter.where("userId", "==", event.uid)), bulkWriter);
  await removeDocumentsRecursively(firestore.collection("bankCredentials").where(Filter.where("userId", "==", event.uid)), bulkWriter);
  await bulkWriter.close();
}

export async function removeDocumentsRecursively(query: Query, bulkWriter: BulkWriter) {
  query.stream().on("data", (documentSnapshot: DocumentReference) => {
    void firestore.recursiveDelete(documentSnapshot, bulkWriter);
  });
}
