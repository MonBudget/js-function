
import * as zod from "zod";
import {firestore} from "../firebase/firestore";
import {Timestamp} from "firebase-admin/firestore";


const BankCredentialsSchema = zod.object({
  credentialsId: zod.string(),
  userId: zod.string(),
  status: zod.string(),
  accountIds: zod.array(zod.string()),
  originalAccountIds: zod.array(zod.string()).optional(),
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
  providerName: zod.string(),
  lastRefresh: zod.date(),
  sessionExpiration: zod.date().nullable(),
  financialInstitution: zod.object({
    id: zod.string(),
    name: zod.string(),
    logo: zod.string(),
  }),
  rawProviderConsent: zod.unknown(),
  rawProvider: zod.unknown(),
});
export type BankCredentials = zod.infer<typeof BankCredentialsSchema>

export async function updateBankCredentials(credentials: BankCredentials) {
  const validatedCredentials = BankCredentialsSchema.parse(credentials);
  const data = {
    credentialsId: validatedCredentials.credentialsId,
    userId: validatedCredentials.userId,
    accountIds: validatedCredentials.accountIds,
    originalAccountIds: validatedCredentials.originalAccountIds,
    status: validatedCredentials.status,
    error: validatedCredentials.error,
    lastRefresh: Timestamp.fromDate(validatedCredentials.lastRefresh),
    providerName: validatedCredentials.providerName,
    sessionExpiration: validatedCredentials.sessionExpiration ? Timestamp.fromDate(validatedCredentials.sessionExpiration) : null,
    financialInstitution: {
      id: validatedCredentials.financialInstitution.id,
      name: validatedCredentials.financialInstitution.name,
      logo: validatedCredentials.financialInstitution.logo,
    },
    rawProviderConsent: validatedCredentials.rawProviderConsent ? validatedCredentials.rawProviderConsent : null,
    rawProvider: validatedCredentials.rawProvider ? validatedCredentials.rawProvider : null,
  };
  if (!data.originalAccountIds) {
    delete data.originalAccountIds;
  }
  await firestore.collection("bankCredentials").doc(validatedCredentials.credentialsId).set(data);
}
