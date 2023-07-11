/* eslint-disable no-invalid-this */
import * as firebaseTest from "firebase-functions-test";
const test = firebaseTest({projectId: "monbudget-2f616"});
import {afterEach} from "mocha";
import {assert} from "chai";
import {firestore} from "../src/firebase/firestore";

afterEach(async function() {
  await test.firestore.clearFirestoreData("monbudget-2f616");
  test.cleanup();
  console.log("Cleaned database");
});

describe("Cloud function: onTransactionUpdated", () => {
  it("When the transaction's categoryId is updated, then its expenseId is set with the expense having the same categoryId", async () => {
    const expenseId = "expense-1";
    await createExpense({
      categoryId: "a:b",
      expenseId: expenseId,
    });
    await createExpense({
      categoryId: "a",
    });
    await createExpense({
      categoryId: "a:b:c",
    });
    const transaction = await createTransaction({});
    await transaction.update("categoryId", "a:b");

    await waitFunctionExecution();

    assert.equal((await transaction.get()).data()?.expenseId, expenseId);
  });
  it("When the transaction's categoryId is updated, then its expenseId is set with the expense having the closest parent categoryId", async () => {
    const expenseId = "expense-1";
    await createExpense({
      categoryId: "a",
    });
    await createExpense({
      categoryId: "a:b:c:d:e",
    });
    await createExpense({
      expenseId: expenseId,
      categoryId: "a:b",
    });
    const transaction = await createTransaction({});
    await transaction.update("categoryId", "a:b:c:d");

    await waitFunctionExecution();

    assert.equal((await transaction.get()).data()?.expenseId, expenseId);
  });
  it("When the transaction's categoryId is updated while no expense can be linked, then its expenseId is set to null", async () => {
    await createExpense({
      categoryId: "a",
    });
    await createExpense({
      categoryId: "a:b:c:d:e",
    });
    await createExpense({
      categoryId: "a:b",
    });
    const transaction = await createTransaction({});
    await transaction.update("categoryId", "zz");

    await waitFunctionExecution();

    assert.equal((await transaction.get()).data()?.expenseId, null);
  });
});

const defaults = {
  userId: "user-a",
  accountId: "a",
};

async function createTransaction(params: {accountId?: string, userId?: string, categoryId?: string}) {
  const doc = firestore.collection("bankAccounts").doc(params.accountId ?? defaults.accountId).collection("bankAccounts-transactions").doc();
  await doc.create({
    userId: params.userId ?? defaults.userId,
    accountId: params.accountId ?? defaults.accountId,
    expenseId: null,
    categoryId: params.categoryId ?? null,
  });
  return doc;
}

async function createExpense(params: {userId?: string, categoryId: string, expenseId?: string}) {
  const doc = params.expenseId ? firestore.collection("expenses").doc(params.expenseId) : firestore.collection("expenses").doc();
  await doc.create({
    userId: params.userId ?? defaults.userId,
    categoryId: params.categoryId,
  });
  return doc;
}

function waitFunctionExecution() {
  return new Promise((resolve) => {
    setTimeout(resolve, 1500);
  });
}
