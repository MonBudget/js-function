import * as zod from "zod";
import {fetcheuh} from "../shared/httpUtils";
import {MonetaryAmountSchema, nextPageTokenTransformer} from "./shared";

export async function getTransactionsPage(params: {
  accessToken: string,
  pageSize?: number,
  earliestBookedDate?: string,
  latestBookedDate?: string,
  pageToken?: string,
  accountIds?: string[],
  status?: TransactionStatus | TransactionStatus[],
}) {
  const url = new URL("https://api.tink.com/data/v2/transactions");
  if (params.pageSize) url.searchParams.append("pageSize", params.pageSize.toString());
  if (params.pageToken) url.searchParams.append("pageToken", params.pageToken);
  if (params.accountIds) url.searchParams.append("accountIdIn", params.accountIds.join(","));
  if (params.earliestBookedDate) url.searchParams.append("bookedDateGte", params.earliestBookedDate);
  if (params.latestBookedDate) url.searchParams.append("bookedDateLte", params.latestBookedDate);
  if (params.status) {
    if (params.status instanceof Array) {
      url.searchParams.append("statusIn", params.status.join(","));
    } else {
      url.searchParams.append("statusIn", params.status);
    }
  }

  return await fetcheuh("GET", url, params.accessToken, undefined, TransactionPageSchema);
}

export async function* getAllTransactions(params: {
  accessToken: string,
  pageSize?: number,
  earliestBookedDate?: string,
  latestBookedDate?: string,
  accountIds?: string[],
  status?: TransactionStatus | TransactionStatus[],
}) {
  let nextPageToken: string | undefined = undefined;
  while (true) {
    const page = await getTransactionsPage({...params, pageToken: nextPageToken});
    for (const {value: transaction, index} of page.transactions.map((value, index) => ({index, value}))) {
      yield {...transaction, __originalPayload__: page.__originalPayload__.transactions[index]};
    }
    if (!page.nextPageToken || page.nextPageToken.length == 0) {
      return;
    }
    nextPageToken = page.nextPageToken;
  }
}

const TransactionStatusSchema = zod.enum(["UNDEFINED", "PENDING", "BOOKED"]);
export type TransactionStatus = zod.infer<typeof TransactionStatusSchema>
const TransactionTypeSchema = zod.enum(["UNDEFINED", "CREDIT_CARD", "PAYMENT", "WITHDRAWAL", "DEFAULT", "TRANSFER"]);
export type TransactionType = zod.infer<typeof TransactionTypeSchema>

const TransactionSchema = zod.object({
  id: zod.string(),
  accountId: zod.string(),
  reference: zod.string().optional(),
  amount: MonetaryAmountSchema,
  descriptions: zod.object({
    original: zod.string().trim(),
    display: zod.string(),
  }).optional(),
  dates: zod.object({
    booked: zod.string().regex(/\d{4}-\d{2}-\d{2}/).optional(),
    value: zod.string().regex(/\d{4}-\d{2}-\d{2}/).optional(),
  }).optional(),
  identifiers: zod.object({
    providerTransactionId: zod.string().optional(),
  }).optional(),
  merchantInformation: zod.object({
    merchantCategoryCode: zod.string().optional(),
    merchantName: zod.string().optional(),
  }).optional(),
  types: zod.object({
    type: TransactionTypeSchema,
  }),
  status: TransactionStatusSchema,
  providerMutability: zod.enum(["MUTABILITY_UNDEFINED", "MUTABLE", "IMMUTABLE"]),
});
export type Transaction = zod.infer<typeof TransactionSchema>
const TransactionPageSchema = zod.object({
  transactions: zod.array(TransactionSchema),
  nextPageToken: zod.string().transform(nextPageTokenTransformer),
});
