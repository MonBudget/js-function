import * as logger from "firebase-functions/logger";
import {getAccessTokenForTinkUserId} from "../tinkApi/auth";
import {getProviderByName, getProviderConsent} from "../tinkApi/credentials";
import {updateBankCredentials} from "../repository/bankCredentials";
import {getAllAccounts} from "../tinkApi/account";
import {getStableAccountId} from "./anonymousStuff";
import {tryGetRawPayload} from "../shared/httpUtils";


export async function saveCredentials(params: {tinkUserId: string, firebaseUserId: string, credentialsId: string}) {
  logger.info(`Saving credentials ${params.credentialsId}...`);
  const accessToken = await getAccessTokenForTinkUserId(params.tinkUserId, ["provider-consents:read", "credentials:read", "accounts:read"]);
  const providerConsent = await getProviderConsent({
    accessToken: accessToken,
    credentialsId: params.credentialsId,
  });
  if (providerConsent) {
    const provider = await getProviderByName({accessToken, includeTestProviders: true, name: providerConsent.providerName});
    if (provider) {
      const accountIds = [];
      const originalAccountIds = providerConsent.accountIds;
      for await (const account of await getAllAccounts({accessToken, accountIds: providerConsent.accountIds})) {
        accountIds.push(getStableAccountId({firebaseUserId: params.firebaseUserId, account}));
      }

      await updateBankCredentials({
        credentialsId: params.credentialsId,
        userId: params.firebaseUserId,
        originalAccountIds,
        accountIds,
        providerName: providerConsent.providerName,
        status: providerConsent.status,
        error: providerConsent.detailedError ?? null,
        lastRefresh: providerConsent.statusUpdated,
        sessionExpiration: providerConsent.sessionExpiryDate ?? null,
        financialInstitution: {
          id: provider.financialInstitutionId,
          name: provider.financialInstitutionName,
          logo: provider.images.icon,
        },
        rawProviderConsent: tryGetRawPayload(providerConsent),
        rawProvider: tryGetRawPayload(provider),
      });
      logger.info(`Refreshed credentials ${params.credentialsId}`);
    } else {
      logger.error(`provider not found for name '${providerConsent.providerName}'`);
    }
  } else {
    logger.error(`providerConsent not found for credentialsId '${params.credentialsId}'`);
  }
}
