
import {firestore, forEachSnapshotAsync, startsWith} from "../firebase/firestore";
import {DocumentSnapshot} from "firebase-admin/firestore";


export async function onExpenseCreated(params: {expenseId: string, doc: DocumentSnapshot}) {
  // Add all transactions in this expense following:
  // - transaction's categoryId in starting with the expense's categoryId
  // - the potential expenses where their categoryId is prefixed with this expense categoryId are ignored
  const userId = params.doc.data()!.userId;
  const categoryId = params.doc.data()!.categoryId;

  const expenseIdsToExclude = (await firestore.collection("expenses").where("userId", "==", userId)
    .where(startsWith("categoryId", `${categoryId}:`))
    .get()).docs.map((doc) => doc.id);

  /* todo add ranges:
    created expense on a:b
    existing expense on a:b:c:d, a:b:c:d:e and a:b:c:z
    transactions :
    a       exp A
    a:b     exp B
    a:b:c   exp B
    a:b:d   exp C
    a:d     exp A
    a:e:f   exp D
    so do like a:b <= categoryId < a:b:c:d && a:b <= categoryId > a:b:c:d
*/
  console.log("Other sub-expenses detected:", expenseIdsToExclude);

  const query = firestore.collectionGroup("bankAccounts-transactions")
    .where("userId", "==", userId)
    .where(startsWith("categoryId", categoryId));

  const bulkWriter = firestore.bulkWriter();
  await forEachSnapshotAsync(
    query,
    async (transactionDoc) => {
      // if no expenseId, let's go
      // if already linked to a child expense, ignore it
      if (!transactionDoc.data().expenseId || expenseIdsToExclude.findIndex((expId) => expId === transactionDoc.data().expenseId) === -1) {
        console.log(`transaction ${transactionDoc.id} found for created expense ${params.expenseId}`);
        void bulkWriter.update(transactionDoc.ref, "expenseId", params.expenseId);
      }
    }
  );
  await bulkWriter.close();
}
