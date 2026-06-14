export interface PricingBreakdown {
  basePrice: number;
  taxPercent: number;
  taxAmount: number;
  totalPrice: number;
}

/** total = base + (base * tax% / 100) */
export function calcPricing(basePrice: number, taxPercent: number): PricingBreakdown {
  const base = Math.max(0, basePrice);
  const tax = Math.max(0, taxPercent);
  const taxAmount = parseFloat(((base * tax) / 100).toFixed(3));
  const totalPrice = parseFloat((base + taxAmount).toFixed(3));
  return { basePrice: base, taxPercent: tax, taxAmount, totalPrice };
}

export function isPriceChanged(original: number, current: number): boolean {
  return Math.abs(original - current) > 0.001;
}
