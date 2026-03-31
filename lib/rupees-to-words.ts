const ones = [
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

function twoDigits(n: number): string {
  if (n < 20) return ones[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return o ? `${tens[t]} ${ones[o]}` : tens[t];
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (h) parts.push(`${ones[h]} Hundred`);
  if (rest) parts.push(twoDigits(rest));
  return parts.join(" ");
}

/** Whole rupees only; title case phrase for UI. */
export function rupeesToWords(rupees: number): string {
  if (!Number.isFinite(rupees) || rupees < 0) return "Zero";
  const n = Math.floor(rupees);
  if (n === 0) return "Zero";

  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const remainder = n % 1000;

  const chunks: string[] = [];
  if (crore) chunks.push(`${twoDigits(crore)} Crore`);
  if (lakh) chunks.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) chunks.push(`${twoDigits(thousand)} Thousand`);
  if (remainder) chunks.push(threeDigits(remainder));

  return chunks.join(" ").replace(/\s+/g, " ").trim();
}

export function rupeesLine(rupees: number): string {
  const whole = Math.floor(rupees);
  const paise = Math.round((rupees - whole) * 100);
  if (paise > 0) {
    return `Rupees ${rupeesToWords(whole)} and Paise ${twoDigits(paise)} Only`;
  }
  return `Rupees ${rupeesToWords(whole)} Only`;
}
