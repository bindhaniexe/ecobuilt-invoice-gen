const belowTwenty = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const tens = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

function twoDigitWords(value: number): string {
  if (value < 20) return belowTwenty[value];
  const ten = Math.floor(value / 10);
  const one = value % 10;
  return [tens[ten], belowTwenty[one]].filter(Boolean).join(" ");
}

function threeDigitWords(value: number): string {
  const hundred = Math.floor(value / 100);
  const rest = value % 100;
  return [
    hundred ? `${belowTwenty[hundred]} Hundred` : "",
    rest ? twoDigitWords(rest) : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function integerToIndianWords(value: number): string {
  if (value === 0) return "Zero";

  const parts: string[] = [];
  const crore = Math.floor(value / 10000000);
  value %= 10000000;
  const lakh = Math.floor(value / 100000);
  value %= 100000;
  const thousand = Math.floor(value / 1000);
  value %= 1000;

  if (crore) parts.push(`${integerToIndianWords(crore)} Crore`);
  if (lakh) parts.push(`${threeDigitWords(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigitWords(thousand)} Thousand`);
  if (value) parts.push(threeDigitWords(value));

  return parts.join(" ");
}

export function amountToIndianWords(amount: number): string {
  const safeAmount = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  const totalPaise = Math.round(safeAmount * 100);
  const rupees = Math.floor(totalPaise / 100);
  const paise = totalPaise % 100;
  const rupeeLabel = rupees === 1 ? "Rupee" : "Rupees";
  const base = `${integerToIndianWords(rupees)} ${rupeeLabel}`;

  if (!paise) return `${base} Only`;

  const paiseLabel = paise === 1 ? "Paisa" : "Paise";
  return `${base} and ${integerToIndianWords(paise)} ${paiseLabel} Only`;
}
