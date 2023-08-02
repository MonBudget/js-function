import {BulkWriter, FieldValue, Timestamp} from "firebase-admin/firestore";
import {firestore} from "../firebase/firestore";
import {Transaction} from "../tinkApi/transaction";
import {amountToNumber} from "../tinkApi/shared";

export function createTransaction(params: {firebaseUserId: string, transaction: Transaction, bulkWriter?: BulkWriter}) {
  const {firebaseUserId, transaction, bulkWriter} = params;
  const accountRef = firestore.collection("bankAccounts").doc(transaction.accountId);
  const transactionRef = accountRef.collection("bankAccounts-transactions").doc(transaction.id);
  const dates = selectDates({valueDate: transaction.dates?.value, bookingDate: transaction.dates?.booked});
  const data = {
    id: transaction.id,
    userId: firebaseUserId,
    amount: amountToNumber(transaction.amount),
    dbCreationDate: FieldValue.serverTimestamp(),
    bankCreationDate: dates.creationDate,
    bankPaymentDate: dates.paymentDate,
    date: dates.creationDate,
    currencyCode: transaction.amount.currencyCode,
    accountId: accountRef,
    categoryId: null,
    expenseId: null,
    type: transaction.types.type,

    ...getDocumentFieldsToUpdate(transaction),
  };
  if (bulkWriter) {
    return bulkWriter.create(transactionRef, data);
  } else {
    return transactionRef.create(data);
  }
}

function getDocumentFieldsToUpdate(transaction: Transaction) {
  return {
    pending: transaction.status === "PENDING",
    descriptionOriginal: transaction.descriptions?.original ?? null,
    descriptionCleaned: transaction.descriptions?.display ?? null,
  };
}

export function updateTransaction(params: {transaction: Transaction, bulkWriter?: BulkWriter}) {
  const {transaction, bulkWriter} = params;
  const accountRef = firestore.collection("bankAccounts").doc(transaction.accountId);
  const transactionRef = accountRef.collection("bankAccounts-transactions").doc(transaction.id);
  const data = getDocumentFieldsToUpdate(transaction);
  if (bulkWriter) {
    return bulkWriter.update(transactionRef, data);
  } else {
    return transactionRef.update(data);
  }
}

function selectDates(params: {valueDate: string|undefined, bookingDate: string|undefined}) {
  const [creationDateRaw, paymentDateRaw] = [params.valueDate, params.bookingDate].sort();
  const creationDate = creationDateRaw ? Timestamp.fromMillis(Date.parse(creationDateRaw)) : Timestamp.now();
  return {
    creationDate: creationDate,
    paymentDate: paymentDateRaw ? Timestamp.fromMillis(Date.parse(paymentDateRaw)) : creationDate,
  };
}
