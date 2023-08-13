import {Account} from "../tinkApi/account";
import {amountToNumber} from "../tinkApi/shared";
import {Transaction} from "../tinkApi/transaction";


export async function setStableTransactionId(params: {firebaseUserId: string, transaction: Transaction}) {
  // todo side case: when same transaction from multiple providers, the providerTransactionId may not be on all providers, so the stable id can change
  const providerTransactionId = params.transaction.identifiers?.providerTransactionId ?? params.transaction.reference;
  if (providerTransactionId != null) {
    params.transaction.id = `f_${b64(providerTransactionId)}`;
  } else {
    const {createHash} = await import("crypto");
    const hashBuf = createHash("sha256");
    hashBuf.update(params.transaction.dates?.booked ?? "");
    hashBuf.update(params.transaction.dates?.value ?? "");
    hashBuf.update(amountToNumber(params.transaction.amount)!.toString());
    hashBuf.update(params.transaction.descriptions?.original ?? "");
    params.transaction.id = `g_${hashBuf.digest("hex")}`;
  }
}

export function getStableAccountId(params: {firebaseUserId: string, account: Account}) {
  const providerAccountId = params.account.identifiers?.iban?.iban ?? params.account.identifiers?.financialInstitution?.accountNumber;
  if (providerAccountId) {
    return `f_${params.firebaseUserId}_${b64(providerAccountId)}`;
  }
  return params.account.id;
}

function b64(value: string) {
  return btoa(value).replace("=", "");
}
