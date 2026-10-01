// Indian GST rules, simplified for a single-business deployment:
// - Same state as the business -> split into CGST + SGST (half the rate each)
// - Different state -> IGST (full rate)
// This mirrors what myBillBook and similar tools do for standard (non-export,
// non-reverse-charge) invoices. Export/SEZ/reverse-charge handling is not
// implemented - see README "Not built yet".

export interface TaxBreakdown {
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  total: number;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function isInterState(businessState: string, customerState: string): boolean {
  return businessState.trim().toLowerCase() !== customerState.trim().toLowerCase();
}

export function calculateLineItem(params: {
  quantity: number;
  rate: number;
  discountPercent: number;
  gstRate: number;
  businessState: string;
  customerState: string;
}): TaxBreakdown {
  const { quantity, rate, discountPercent, gstRate, businessState, customerState } = params;

  const gross = quantity * rate;
  const discount = gross * (discountPercent / 100);
  const taxableValue = round2(gross - discount);
  const interState = isInterState(businessState, customerState);

  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (interState) {
    igst = round2(taxableValue * (gstRate / 100));
  } else {
    cgst = round2(taxableValue * (gstRate / 200));
    sgst = round2(taxableValue * (gstRate / 200));
  }

  const totalTax = round2(cgst + sgst + igst);
  const total = round2(taxableValue + totalTax);

  return { taxableValue, cgst, sgst, igst, totalTax, total };
}

export function sumInvoiceTotals(lines: TaxBreakdown[]) {
  const taxableValue = round2(lines.reduce((s, l) => s + l.taxableValue, 0));
  const cgst = round2(lines.reduce((s, l) => s + l.cgst, 0));
  const sgst = round2(lines.reduce((s, l) => s + l.sgst, 0));
  const igst = round2(lines.reduce((s, l) => s + l.igst, 0));
  const totalTax = round2(cgst + sgst + igst);
  const preRoundTotal = round2(taxableValue + totalTax);
  const grandTotal = Math.round(preRoundTotal); // Indian invoices conventionally round to the nearest rupee
  const roundOff = round2(grandTotal - preRoundTotal);

  return { taxableValue, cgst, sgst, igst, totalTax, preRoundTotal, roundOff, grandTotal };
}
