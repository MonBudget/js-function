import {BulkWriter, FieldValue, Timestamp, WriteBatch} from "firebase-admin/firestore";
import {firestore} from "../firebase/firestore";
import * as zod from "zod";


const TransactionEntitySchema = zod.object({
  id: zod.string(),
  accountId: zod.string(),
  userId: zod.string(),
  pending: zod.boolean(),
  amount: zod.number(),
  currencyCode: zod.string(),
  descriptionOriginal: zod.string(),
  descriptionCleaned: zod.string(),
  creationDate: zod.date(),
  paymentDate: zod.date(),
});
export type TransactionEntity = zod.infer<typeof TransactionEntitySchema>

export async function createTransaction(params: {transaction: TransactionEntity, bulkWriter?: BulkWriter, batch?: WriteBatch}) {
  const {transaction, bulkWriter, batch} = params;
  const accountRef = firestore.collection("bankAccounts").doc(transaction.accountId);
  const transactionRef = accountRef.collection("bankAccounts-transactions").doc(transaction.id);
  const data = {
    id: transaction.id,
    userId: transaction.userId,
    amount: transaction.amount,
    dbCreationDate: FieldValue.serverTimestamp(),
    bankCreationDate: Timestamp.fromDate(transaction.creationDate),
    bankPaymentDate: Timestamp.fromDate(transaction.paymentDate),
    date: Timestamp.fromDate(transaction.creationDate),
    currencyCode: transaction.currencyCode,
    accountId: accountRef,
    categoryId: null,
    expenseId: null,

    ...getDocumentFieldsToUpdate(transaction),
  };
  if (bulkWriter) {
    void bulkWriter.create(transactionRef, data);
  } else if (batch) {
    batch.create(transactionRef, data);
  } else {
    await transactionRef.create(data);
  }
  return Promise.resolve();
}

function getDocumentFieldsToUpdate(transaction: TransactionEntity) {
  return {
    pending: transaction.pending,
    descriptionOriginal: transaction.descriptionOriginal,
    descriptionCleaned: transaction.descriptionCleaned,
  };
}

export async function updateTransaction(params: {transaction: TransactionEntity, bulkWriter?: BulkWriter, batch?: WriteBatch}) {
  const {transaction, bulkWriter, batch} = params;
  const accountRef = firestore.collection("bankAccounts").doc(transaction.accountId);
  const transactionRef = accountRef.collection("bankAccounts-transactions").doc(transaction.id);
  const data = getDocumentFieldsToUpdate(transaction);
  if (bulkWriter) {
    void bulkWriter.update(transactionRef, data);
  } else if (batch) {
    batch.update(transactionRef, data);
  } else {
    await transactionRef.update(data);
  }
  return Promise.resolve();
}

export async function removeTransaction(params: {transactionId: string, bulkWriter?: BulkWriter, batch?: WriteBatch}) {
  const {transactionId, bulkWriter, batch} = params;
  const transactionDoc = await firestore.collectionGroup("bankAccounts-transactions").where("id", "==", transactionId).get();
  if (!transactionDoc.empty) {
    const transactionRef = transactionDoc.docs[0].ref;
    if (bulkWriter) {
      return bulkWriter.delete(transactionRef);
    } else if (batch) {
      batch.delete(transactionRef);
    } else {
      await transactionRef.delete();
    }
  }
  return Promise.resolve();
}
