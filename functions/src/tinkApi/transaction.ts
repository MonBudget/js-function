import {fetcheuh} from "../httpUtils";
import {MonetaryAmount} from "./shared";

export async function getTransactions(
  accessToken: string,
  pageSize: number | undefined = undefined,
  earliestBookedDate: string | undefined = undefined,
  latestBookedDate: string | undefined = undefined,
  pageToken: string | undefined = undefined,
  accountIds: string[] | undefined = undefined,
  status: TransactionStatus | undefined = undefined,
): Promise<{
    transactions: Transaction[]
    nextPageToken: string | undefined
  }> {
  const url = new URL("https://api.tink.com/data/v2/transactions");
  if (pageSize) url.searchParams.append("pageSize", pageSize.toString());
  if (pageToken) url.searchParams.append("pageToken", pageToken);
  if (accountIds) url.searchParams.append("accountIdIn", accountIds.join(","));
  if (earliestBookedDate) url.searchParams.append("bookedDateGte", earliestBookedDate);
  if (latestBookedDate) url.searchParams.append("bookedDateLte", latestBookedDate);
  if (status) url.searchParams.append("statusIn", status);

  return await fetcheuh("GET", url, accessToken);
}

export type Transaction = {
    id: string,
    accountId: string,
    reference: string | undefined,
    amount: MonetaryAmount,
    descriptions: {
      original: string
      display: string
    },
    dates: {
      booked: string | undefined
      value: string | undefined
    } | undefined,
    identifiers: {providerTransactionId: string},
    types: {type: TransactionType},
    status: TransactionStatus,
    providerMutability: string,
  }

export type TransactionStatus = "UNDEFINED" | "PENDING" | "BOOKED"
export type TransactionType = "UNDEFINED" | "CREDIT_CARD" | "PAYMENT" | "WITHDRAWAL" | "DEFAULT" | "TRANSFER"
