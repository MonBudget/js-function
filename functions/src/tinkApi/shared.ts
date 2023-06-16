import * as zod from "zod";

export const MonetaryAmountSchema = zod.object( {
  value: zod.object({
    unscaledValue: zod.coerce.number(),
    scale: zod.coerce.number(),
  }),
  currencyCode: zod.string().regex(/[A-Z]{3}/), // ISO-4217
});
export type MonetaryAmount = zod.infer<typeof MonetaryAmountSchema>

export function amountToNumber(amount: MonetaryAmount | undefined) {
  if (!amount) return undefined;
  return amount.value.unscaledValue / Math.pow(10, amount.value.scale);
}

export function nextPageTokenTransformer(str: string) {
  if (str.length == 0) return undefined;
  return str;
}
