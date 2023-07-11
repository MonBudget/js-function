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

describe("Cloud function: onExpenseRemoved", () => {
  it("When the expense is removed and there is no other corresponding expense, all the related transactions' expenseId are set to null", async () => {
    const expense = await createExpense({
      categoryId: "a:b",
    });
    await createExpense({
      categoryId: "zz",
    });
    await createExpense({
      categoryId: "a:b:c",
    });
    const transaction1 = await createTransaction({
      categoryId: "a:b",
      expenseId: expense.id,
    });
    const transaction2 = await createTransaction({
      categoryId: "a:b",
      expenseId: expense.id,
    });
    await expense.delete();

    await waitFunctionExecution();

    assert.equal((await transaction1.get()).data()?.expenseId, null);
    assert.equal((await transaction2.get()).data()?.expenseId, null);
  });

  it("When the expense is removed and there is another parent expense, all the related transactions are updated with the corresponding expenseId", async () => {
    await createExpense({
      categoryId: "z",
    });
    await createExpense({
      categoryId: "a",
    });
    await createExpense({
      categoryId: "a:b:c:d:e",
    });
    const parentExpense = await createExpense({
      categoryId: "a:b",
    });
    const expense = await createExpense({
      categoryId: "a:b:c",
    });
    const transaction1 = await createTransaction({
      categoryId: "a:b:c:d",
      expenseId: expense.id,
    });
    const transaction2 = await createTransaction({
      categoryId: "a:b:c:d",
      expenseId: expense.id,
    });
    await expense.delete();

    await waitFunctionExecution();

    assert.equal((await transaction1.get()).data()?.expenseId, parentExpense.id);
    assert.equal((await transaction2.get()).data()?.expenseId, parentExpense.id);
  });
});

const defaults = {
  userId: "user-a",
  accountId: "a",
};

async function createTransaction(params: {accountId?: string, userId?: string, categoryId?: string, expenseId?: string}) {
  const doc = firestore.collection("bankAccounts").doc(params.accountId ?? defaults.accountId).collection("bankAccounts-transactions").doc();
  await doc.create({
    userId: params.userId ?? defaults.userId,
    accountId: params.accountId ?? defaults.accountId,
    expenseId: params.expenseId ?? null,
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
