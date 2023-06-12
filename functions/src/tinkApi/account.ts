import {fetcheuh} from "../httpUtils";
import {MonetaryAmount} from "./shared";

export async function getAccounts(
  accessToken: string,
  pageSize: number | undefined = undefined,
  pageToken: string | undefined = undefined,
): Promise<{
    accounts: Account[]
    nextPageToken: string | undefined
  }> {
  const url = new URL("https://api.tink.com/data/v2/accounts");
  if (pageSize) url.searchParams.append("pageSize", pageSize.toString());
  if (pageToken) url.searchParams.append("pageToken", pageToken);

  return await fetcheuh("GET", url, accessToken);
}

export type Account = {
    id: string
    name: string
    type: string
    balances: {
      booked: {amount: MonetaryAmount} | undefined
      available: {amount: MonetaryAmount} | undefined
    }
    financialInstitutionId: string
    dates: {lastRefreshed: number}
    identifiers: {
      iban: {
        iban: string | undefined
        bban: string | undefined
      } | undefined
      financialInstitution: {
        accountNumber: string
      }
    }
  }

export async function getAccount(
  accountId: string,
  accessToken: string,
): Promise<Account> {
  return await fetcheuh("GET", `https://api.tink.com/data/v2/accounts/${accountId}`, accessToken);
}

