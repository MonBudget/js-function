import {Timestamp} from "firebase-admin/firestore";
import {firestore} from "../firebase/firestore";
import * as zod from "zod";


const AccountEntitySchema = zod.object({
  id: zod.string(),
  originalAccountId: zod.string(),
  userId: zod.string(),
  name: zod.string(),
  type: zod.enum(["UNDEFINED", "CHECKING", "SAVINGS", "CREDIT_CARD"]),
  balances: zod.object({
    booked: zod.number().nullable(),
    available: zod.number().nullable(),
  }),
  currencyCode: zod.string().nullable(),
  financialInstitutionId: zod.string().nullable(),
  lastRefreshed: zod.date(),
  iban: zod.string().nullable(),
  bic: zod.string().nullable(),
  accountNumberInFinancialInstitution: zod.string().nullable(),
});
export type AccountEntity = zod.infer<typeof AccountEntitySchema>

export async function saveAccount(account: AccountEntity) {
  const accountDocument = firestore.collection("bankAccounts").doc(account.id);
  const data = {
    id: account.id,
    originalAccountId: account.originalAccountId,
    userId: account.userId,
    type: account.type,
    originalName: account.name,
    currencyCode: account.currencyCode,
    currentBalance: account.balances.available,
    bookedBalance: account.balances.booked,
    lastRefresh: Timestamp.fromDate(account.lastRefreshed),
    financialInstitutionId: account.financialInstitutionId,
    financialAccountNumber: account.accountNumberInFinancialInstitution,
    iban: account.iban,
    bic: account.bic,
  };
  await accountDocument.set(data, {merge: true});
}
