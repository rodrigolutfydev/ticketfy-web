export const FREE_LOT_SUGGESTED_MAX_PER_BUYER = "2";

const isFreePrice = (price: string) => price.trim() !== "" && Number(price) === 0;

export function suggestedMaxPerBuyer(price: string, current: string, touched: boolean): string {
  if (touched) return current;
  if (isFreePrice(price)) return current === "" ? FREE_LOT_SUGGESTED_MAX_PER_BUYER : current;
  return current === FREE_LOT_SUGGESTED_MAX_PER_BUYER ? "" : current;
}

export function maxPerBuyerChange(current: number | null, input: string): number | undefined {
  if (input.trim() === "") return current === null ? undefined : 0;
  const next = Number(input);
  return next === current ? undefined : next;
}
