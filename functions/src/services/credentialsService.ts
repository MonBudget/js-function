import * as logger from "firebase-functions/logger";
import {getAccessTokenForUserId} from "../tinkApi/auth";
import {getProvider, getProviderConsents} from "../tinkApi/credentials";
import {updateBankCredentials} from "../repository/bankCredentials";


export async function saveCredentials(params: {userId: string, credentialsId: string}) {
  logger.info(`Saving credentials ${params.credentialsId}...`);
  const accessToken = await getAccessTokenForUserId(params.userId, ["provider-consents:read", "credentials:read"]);
  const providerConsent = (await getProviderConsents({
    accessToken: accessToken,
    credentialsId: params.credentialsId,
  })).providerConsents.at(0);
  if (providerConsent) {
    const provider = await getProvider({accessToken, includeTestProviders: true, name: providerConsent.providerName});
    if (provider) {
      await updateBankCredentials({
        credentialsId: params.credentialsId,
        userId: params.userId,
        accountIds: providerConsent.accountIds,
        status: providerConsent.status,
        error: providerConsent.detailedError ?? null,
        lastRefresh: providerConsent.statusUpdated,
        sessionExpiration: providerConsent.sessionExpiryDate ?? null,
        financialInstitution: {
          id: provider.financialInstitutionId,
          name: provider.financialInstitutionName,
          logo: provider.images.icon,
        },
      });
      logger.info(`Refreshed credentials ${params.credentialsId}`);
    } else {
      logger.error(`provider not found for name '${providerConsent.providerName}'`);
    }
  } else {
    logger.error(`providerConsent not found for credentialsId '${params.credentialsId}'`);
  }
}
