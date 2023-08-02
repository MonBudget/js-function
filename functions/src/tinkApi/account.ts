import {fetcheuh} from "../shared/httpUtils";
import {MonetaryAmountSchema, nextPageTokenTransformer} from "./shared";
import * as zod from "zod";

export async function getAccountsPage(params:{
  accessToken: string,
  readonly pageSize?: number,
  readonly pageToken?: string,
  readonly accountIds?: string[],
}) {
  const url = new URL("https://api.tink.com/data/v2/accounts");
  if (params.pageSize) url.searchParams.append("pageSize", params.pageSize.toString());
  if (params.pageToken) url.searchParams.append("pageToken", params.pageToken);
  if (params.accountIds) params.accountIds.forEach((accountId) => url.searchParams.append("idIn", accountId));

  return await fetcheuh("GET", url, params.accessToken, undefined, AccountPageSchema);
}

export async function* getAllAccounts(params: {
  accessToken: string,
  pageSize?: number,
  accountIds?: string[],
}) {
  let nextPageToken: string | undefined = undefined;
  while (true) {
    const page = await getAccountsPage({...params, pageToken: nextPageToken});
    for (const account of page.accounts) {
      yield account;
    }
    if (!page.nextPageToken || page.nextPageToken.length == 0) {
      return;
    }
    nextPageToken = page.nextPageToken;
  }
}

const AccountSchema = zod.object({
  id: zod.string(),
  name: zod.string().trim(),
  type: zod.enum(["UNDEFINED", "CHECKING", "SAVINGS", "CREDIT_CARD"]),
  balances: zod.object({
    booked: zod.object({amount: MonetaryAmountSchema}).optional(),
    available: zod.object({amount: MonetaryAmountSchema}).optional(),
  }).optional(),
  financialInstitutionId: zod.string().optional(),
  dates: zod.object({lastRefreshed: zod.string().datetime().transform((str) => new Date(str))}),
  identifiers: zod.object({
    iban: zod.object({
      iban: zod.string(),
      bic: zod.string().optional(),
      bban: zod.string(),
    }).optional(),
    pan: zod.object({
      masked: zod.string(),
    }).optional(),
    sortCode: zod.object({
      accountNumber: zod.string(),
      code: zod.string(),
    }).optional(),
    financialInstitution: zod.object({
      accountNumber: zod.string(),
      referenceNumbers: zod.any(),
    }).optional(),
  }).optional(),
});
const AccountPageSchema = zod.object({
  accounts: zod.array(AccountSchema),
  nextPageToken: zod.string().transform(nextPageTokenTransformer),
});
export type Account = zod.infer<typeof AccountSchema>

export async function getAccount(params:{
  accountId: string,
  accessToken: string,
}) {
  return await fetcheuh("GET", `https://api.tink.com/data/v2/accounts/${params.accountId}`, params.accessToken, undefined, AccountSchema);
}
