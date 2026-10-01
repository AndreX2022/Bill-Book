// Indian financial year runs April -> March, and invoice books conventionally
// reset/reference the FY, e.g. INV/25-26/0001.

export function currentIndianFY(date: Date = new Date()): string {
  const month = date.getMonth() + 1; // 1-12
  const year = date.getFullYear();
  const startYear = month >= 4 ? year : year - 1;
  const endYear = (startYear + 1) % 100;
  return `${String(startYear).slice(-2)}-${String(endYear).padStart(2, "0")}`;
}

export function formatInvoiceNumber(prefix: string, seq: number, date: Date = new Date()): string {
  const fy = currentIndianFY(date);
  return `${prefix}/${fy}/${String(seq).padStart(4, "0")}`;
}
