
import {firestore, forEachSnapshotAsync} from "../firebase/firestore";
import {DocumentReference, DocumentSnapshot} from "firebase-admin/firestore";
import {findAndUpdateTransactionExpenseId} from "./onTransactionUpdated";


export async function onExpenseRemoved(params: {expenseId: string, doc: DocumentSnapshot}) {
  // expense removed, let's try to put related transactions to another expense, or just put them as unexpected
  const bulkWriter = firestore.bulkWriter();
  await forEachSnapshotAsync(
    firestore.collectionGroup("bankAccounts-transactions").where("expenseId", "==", params.expenseId),
    async (doc) => {
      if (!await findAndUpdateTransactionExpenseId({
        userId: doc.data().userId,
        accountId: (doc.data().accountId as DocumentReference).id,
        categoryId: doc.data().categoryId,
        transactionId: doc.id,
      })) { // no expense found, let's put null
        void bulkWriter.update(doc.ref, "expenseId", null);
      }
    }
  );
  await bulkWriter.close();
}
