import {Account} from "../tinkApi/account";
import {Transaction} from "../tinkApi/transaction";

// Hack to try the max of having a stable transaction id, since each one-time fetch generates a new id
export function setStableTransactionId(params: {firebaseUserId: string, transaction: Transaction}) {
  const providerTransactionId = params.transaction.identifiers?.providerTransactionId ?? params.transaction.reference;
  if (providerTransactionId != null) {
    params.transaction.id = `ot_${params.firebaseUserId}_${btoa(providerTransactionId)}`;
  }
}

export function getStableAccountId(params: {firebaseUserId: string, account: Account}) {
  if (params.account.identifiers?.financialInstitution?.accountNumber) {
    return `ot_${params.firebaseUserId}_${btoa(params.account.identifiers.financialInstitution.accountNumber)}`;
  }
  return `ot_${params.account.id}`;
}

