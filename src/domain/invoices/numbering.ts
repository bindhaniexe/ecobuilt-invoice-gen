export function getIndianFinancialYear(date: Date): {
  startYear: number;
  endYearShort: string;
  prefix: string;
} {
  const month = date.getMonth();
  const calendarYear = date.getFullYear();
  const startYear = month >= 3 ? calendarYear : calendarYear - 1;
  const endYearShort = String((startYear + 1) % 100).padStart(2, "0");

  return {
    startYear,
    endYearShort,
    prefix: `INV-${startYear}-${endYearShort}`,
  };
}

export function generateInvoiceNumber(
  date: Date,
  existingInvoiceNumbers: string[],
): string {
  const { prefix } = getIndianFinancialYear(date);
  const maxSequence = existingInvoiceNumbers.reduce((max, invoiceNumber) => {
    if (!invoiceNumber.startsWith(`${prefix}-`)) return max;
    const sequence = Number(invoiceNumber.slice(prefix.length + 1));
    return Number.isFinite(sequence) ? Math.max(max, sequence) : max;
  }, 0);

  return `${prefix}-${String(maxSequence + 1).padStart(4, "0")}`;
}
