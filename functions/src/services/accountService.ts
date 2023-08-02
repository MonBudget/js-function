import {Timestamp} from "firebase-admin/firestore";
import {firestore} from "../firebase/firestore";
import {Account} from "../tinkApi/account";
import {amountToNumber} from "../tinkApi/shared";

export async function saveAccount(params: {account: Account, firebaseUserId: string, originalAccountId: string|undefined}) {
  const account = params.account;
  const accountDocument = firestore.collection("bankAccounts").doc(account.id);
  const data = {
    id: account.id,
    originalAccountId: params.originalAccountId,
    userId: params.firebaseUserId,
    type: account.type,
    originalName: account.name,
    currencyCode: account.balances?.available?.amount?.currencyCode ?? account.balances?.booked?.amount?.currencyCode ?? null,
    currentBalance: amountToNumber(account.balances?.available?.amount) ?? null,
    bookedBalance: amountToNumber(account.balances?.booked?.amount) ?? null,
    lastRefresh: Timestamp.fromDate(account.dates.lastRefreshed),
    financialInstitutionId: account.financialInstitutionId,
    financialAccountNumber: account.identifiers?.financialInstitution?.accountNumber,
  };
  if (!data.originalAccountId) {
    delete data.originalAccountId;
  }
  await accountDocument.set(data, {merge: true});
}
