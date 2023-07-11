import {firestore} from "../firebase/firestore";
import {QueryDocumentSnapshot, Filter} from "@google-cloud/firestore";
import * as logger from "firebase-functions/logger";


export async function onTransactionUpdated(params: {accountId: string, transactionId: string, before: QueryDocumentSnapshot, after: QueryDocumentSnapshot}) {
  const newCategoryId = params.after.data().categoryId;
  const userId = params.after.data().userId;
  if (params.before.data().categoryId !== newCategoryId) {
    await findAndUpdateTransactionExpenseId({userId: userId, accountId: params.accountId, categoryId: newCategoryId, transactionId: params.transactionId});
  }
}

export async function findAndUpdateTransactionExpenseId(params: { userId: string, accountId: string, transactionId: string, categoryId: string, previousExpenseId?: string|null }) {
  const expenseRef = await findExpenseByCategoryId({categoryId: params.categoryId, userId: params.userId});

  if (expenseRef) {
    if (!params.previousExpenseId || expenseRef.id !== params.previousExpenseId) {
      logger.info(`Linking transaction ${params.transactionId} on category ${params.categoryId} with expense ${expenseRef.id} on category ${expenseRef.data().categoryId}`);
      await setTransactionExpenseId({accountId: params.accountId, transactionId: params.transactionId, expenseId: expenseRef.id});
    }
    return true;
  } else {
    logger.info(`Found no expense for transaction ${params.transactionId} with categoryId ${params.categoryId}`);
    return false;
  }
}

export async function setTransactionExpenseId(params: { accountId: string, transactionId: string, expenseId: string }) {
  await firestore.collection("bankAccounts")
    .doc(params.accountId)
    .collection("bankAccounts-transactions")
    .doc(params.transactionId)
    .update("expenseId", params.expenseId);
}

export async function findExpenseByCategoryId(params: { userId: string, categoryId: string }) {
  return (await firestore.collection("expenses")
    .where("userId", "==", params.userId)
    .where(matchCategoryThenParentCategories(params.categoryId))
    .orderBy("categoryId", "desc")
    .limit(1).get())
    .docs.at(0);
}


function matchCategoryThenParentCategories(categoryId: string) {
  let i = categoryId.length;
  const categoryLevels = [categoryId];
  while ((i = categoryId.lastIndexOf(":", i)) > -1) {
    categoryId = categoryId.substring(0, i);
    categoryLevels.push(categoryId);
  }
  return Filter.where("categoryId", "in", categoryLevels);
}
