// A product stocked in kg or L can be dosed by the gram or millilitre — 75 g of bisulphate into
// a small bath is 0.075 kg, which nobody should have to type. The entry screens let the tech
// switch to the small unit; the quantity is converted back to the stock unit before it is
// saved, so the log, the stock count and the invoices all stay in one unit per product.

/** The smaller measure of a stock unit, or null where there isn't one. */
export const smallUnitOf = (unit: string | null | undefined): string | null =>
  unit === 'kg' ? 'g' : unit === 'L' ? 'mL' : null

/** A quantity entered in `entered` (the stock unit or its small unit), in the stock unit. */
export function toStockUnit(quantity: number, entered: string | null | undefined, stockUnit: string | null | undefined): number {
  return entered && entered !== stockUnit && smallUnitOf(stockUnit) === entered ? quantity / 1000 : quantity
}
