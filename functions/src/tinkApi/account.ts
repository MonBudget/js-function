import {fetcheuh} from "../httpUtils";
import {MonetaryAmountSchema, nextPageTokenTransformer} from "./shared";
import * as zod from "zod";

export async function getAccounts(
  accessToken: string,
  pageSize: number | undefined = undefined,
  pageToken: string | undefined = undefined,
) {
  const url = new URL("https://api.tink.com/data/v2/accounts");
  if (pageSize) url.searchParams.append("pageSize", pageSize.toString());
  if (pageToken) url.searchParams.append("pageToken", pageToken);

  return await fetcheuh("GET", url, accessToken, undefined, AccountPageSchema);
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

export async function getAccount(
  accountId: string,
  accessToken: string,
) {
  return await fetcheuh("GET", `https://api.tink.com/data/v2/accounts/${accountId}`, accessToken, undefined, AccountSchema);
}
