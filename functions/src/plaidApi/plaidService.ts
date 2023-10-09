import {AccountBase, Configuration, CountryCode, PlaidApi, PlaidEnvironments} from "plaid";
import {getPlaidClientId, getPlaidClientSecret, getPlaidEnv} from "../vars";
import {AccountEntity, saveAccount} from "../services/accountRepository";
import {updateBankCredentials} from "../repository/bankCredentials";


export const plaidClient = new PlaidApi(new Configuration({
  basePath: PlaidEnvironments[getPlaidEnv()],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": getPlaidClientId(),
      "PLAID-SECRET": getPlaidClientSecret(),
      "Plaid-Version": "2020-09-14",
    },
  },
}));

export async function savePlaidAccounts(params: {accessToken: string, userId: string}) {
  const {accessToken, userId} = params;
  const {data: {accounts, item: {institution_id: institutionId}}} = await plaidClient.accountsGet({access_token: accessToken});

  for (const account of accounts) {
    await saveAccount(plaidAccountToAccountEntity({account, institutionId: institutionId!, userId}));
  }
}

function plaidAccountToAccountEntity(params: {account: AccountBase, institutionId: string, userId: string}): AccountEntity {
  const {account, institutionId, userId} = params;
  return {
    id: account.account_id,
    originalAccountId: account.account_id,
    userId,
    accountNumberInFinancialInstitution: account.persistent_account_id ?? null,
    balances: {
      available: account.balances.current,
      booked: null, // todo
    },
    iban: null,
    bic: null,
    currencyCode: account.balances.iso_currency_code ?? account.balances.unofficial_currency_code!,
    financialInstitutionId: institutionId,
    lastRefreshed: new Date(account.balances.last_updated_datetime != null ? Date.parse(account.balances.last_updated_datetime) : Date.now()),
    name: account.name,
    type: "CHECKING",
  };
}

export async function savePlaidItem(params: {accessToken: string, userId: string}) {
  const {accessToken, userId} = params;
  const {data: {status: itemStatus, item}} = await plaidClient.itemGet({access_token: accessToken});
  const {data: {accounts}} = await plaidClient.accountsGet({access_token: accessToken});
  const {data: {institution}} = await plaidClient.institutionsGetById({
    country_codes: [CountryCode.Fr],
    institution_id: item.institution_id!,
    options: {include_optional_metadata: true},
  });

  const lastSuccessfulItemUpdate = itemStatus?.transactions?.last_successful_update != null ? Date.parse(itemStatus.transactions.last_successful_update) : 0;
  const lastFailedItemUpdate = itemStatus?.transactions?.last_failed_update != null ? Date.parse(itemStatus.transactions.last_failed_update) : 0;

  await updateBankCredentials({
    credentialsId: item.item_id,
    userId,
    accountIds: accounts.map((account) => account.account_id),
    providerName: institution.name,
    status: null,
    error: item.error != null ? {
      displayMessage: item.error.display_message ?? item.error.error_message,
      type: item.error.error_type.toString(),
      details: {
        reason: item.error.causes?.join() ?? null,
        retryable: null,
      }} : null,
    lastRefresh: new Date(lastSuccessfulItemUpdate > lastFailedItemUpdate ? lastFailedItemUpdate : lastFailedItemUpdate),
    sessionExpiration: item.consent_expiration_time != null ? new Date(Date.parse(item.consent_expiration_time)) : null,
    financialInstitution: {
      id: institution.institution_id,
      name: institution.name,
      logo: institution.logo != null ? "data:image/png;base64," + institution.logo : "",
    },
  });
}
