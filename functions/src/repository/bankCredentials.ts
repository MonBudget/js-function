
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
  const validatedCredentials = BankCredentialsSchema.parse(credentials);
  await firestore.collection("bankCredentials").doc(validatedCredentials.credentialsId).set({
    credentialsId: validatedCredentials.credentialsId,
    userId: validatedCredentials.userId,
    accountIds: validatedCredentials.accountIds.map((accountId) => firestore.collection("bankAccounts").doc(accountId)),
    status: validatedCredentials.status,
    error: validatedCredentials.error,
    lastRefresh: Timestamp.fromDate(validatedCredentials.lastRefresh),
    sessionExpiration: validatedCredentials.sessionExpiration ? Timestamp.fromDate(validatedCredentials.sessionExpiration) : null,
    financialInstitution: {
      id: validatedCredentials.financialInstitution.id,
      name: validatedCredentials.financialInstitution.name,
      logo: validatedCredentials.financialInstitution.logo,
    },
  });
}
