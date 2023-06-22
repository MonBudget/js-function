
import * as zod from "zod";
import {firestore} from "../firebase/firestore";
import {Timestamp} from "firebase-admin/firestore";


const BankCredentialsSchema = zod.object({
  credentialsId: zod.string(),
  userId: zod.string(),
  status: zod.string(),
  accountIds: zod.array(zod.string()),
  error: zod.object({
    type: zod.enum([
      "UNKNOWN_ERROR",
      "TINK_SIDE_ERROR",
      "PROVIDER_ERROR",
      "USER_LOGIN_ERROR",
      "AUTHORIZATION_ERROR",
      "ACCOUNT_INFORMATION_ERROR",
    ]),
    displayMessage: zod.string(),
    details: zod.object({
      reason: zod.string(),
      retryable: zod.boolean(),
    }),
  }).nullable(),
  lastRefresh: zod.date(),
  sessionExpiration: zod.date().nullable(),
  financialInstitution: zod.object({
    id: zod.string(),
    name: zod.string(),
    logo: zod.string(),
  }),
});
export type BankCredentials = zod.infer<typeof BankCredentialsSchema>

export async function updateBankCredentials(credentials: BankCredentials) {
  await firestore.collection("bankCredentials").doc(credentials.credentialsId).set({
    credentialsId: credentials.credentialsId,
    userId: credentials.userId,
    accountIds: credentials.accountIds.map((accountId) => firestore.collection("bankAccounts").doc(accountId)),
    status: credentials.status,
    error: credentials.error,
    lastRefresh: Timestamp.fromDate(credentials.lastRefresh),
    sessionExpiration: credentials.sessionExpiration ? Timestamp.fromDate(credentials.sessionExpiration) : null,
    financialInstitution: {
      id: credentials.financialInstitution.id,
      name: credentials.financialInstitution.name,
      logo: credentials.financialInstitution.logo,
    },
  });
}

