import {fetcheuh} from "../shared/httpUtils";
import * as zod from "zod";


export async function getProviderConsent(params:{
    accessToken: string,
    credentialsId: string,
  }) {
  return (await fetcheuh("GET", "https://api.tink.com/api/v1/provider-consents", params.accessToken, undefined, GetProviderConsentsResponseSchema)).providerConsents.at(0);
}

export async function getProviderByName(params:{
    accessToken: string,
    name: string,
    includeTestProviders: boolean,
  }) {
  const url = new URL("https://api.tink.com/api/v1/providers");
  url.searchParams.append("name", params.name);
  url.searchParams.append("includeTestProviders", params.includeTestProviders.toString());

  return (await fetcheuh("GET", url, params.accessToken, undefined, GetProvidersResponseSchema)).providers.at(0);
}

export async function removeCredentials(params:{
    accessToken: string,
    credentialsId: string,
  }) {
  return await fetcheuh("DELETE", `https://api.tink.com/api/v1/credentials/${params.credentialsId}`, params.accessToken);
}

const GetProviderConsentsResponseSchema = zod.object({
  providerConsents: zod.array(zod.object({
    accountIds: zod.array(zod.string()),
    credentialsId: zod.string(),
    providerName: zod.string(),
    sessionExpiryDate: zod.number().transform((n) => n !== 0 ? new Date(n) : undefined).optional(),
    statusUpdated: zod.number().transform((str) => new Date(str)),
    status: zod.enum([
      "CREATED",
      "AUTHENTICATING",
      "AWAITING_MOBILE_BANKID_AUTHENTICATION",
      "AWAITING_SUPPLEMENTAL_INFORMATION",
      "UPDATING",
      "UPDATED",
      "AUTHENTICATION_ERROR",
      "TEMPORARY_ERROR",
      "PERMANENT_ERROR",
      "AWAITING_THIRD_PARTY_APP_AUTHENTICATION",
      "DELETED",
      "SESSION_EXPIRED",
    ]),
    detailedError: zod.object({
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
    }).optional(),
  })),
});


const ProviderSchema = zod.object({
  financialInstitutionId: zod.string(),
  financialInstitutionName: zod.string(),
  images: zod.object({
    icon: zod.string(),
  }),
});


export type Provider = zod.infer<typeof ProviderSchema>

const GetProvidersResponseSchema = zod.object({
  providers: zod.array(ProviderSchema),
});
