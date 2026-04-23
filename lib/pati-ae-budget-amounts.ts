import { PATI_AE_MISC_LABEL } from "@/lib/pati-ae-categories";

/** Whole-paise allocation so category amounts sum to rounded period spendable. */
export function computePatiAeCategoryAmounts(
  monthlyIncome: number,
  monthlySave: number,
  budgetDays: number,
  categoryPercents: Record<string, number>,
): Record<string, number> {
  const monthlySpendable = Math.max(0, monthlyIncome - monthlySave);
  const periodSpendable = monthlySpendable * (budgetDays / 30);
  const totalPaise = Math.round(periodSpendable * 100);

  const keys = Object.keys(categoryPercents);
  const miscLast = keys
    .filter((k) => k !== PATI_AE_MISC_LABEL)
    .sort((a, b) => a.localeCompare(b));
  const hasMisc = keys.includes(PATI_AE_MISC_LABEL);
  const ordered = hasMisc
    ? [...miscLast, PATI_AE_MISC_LABEL]
    : [...keys].sort((a, b) => a.localeCompare(b));

  const amounts: Record<string, number> = {};
  let allocatedPaise = 0;
  for (let i = 0; i < ordered.length; i++) {
    const k = ordered[i];
    const pct = categoryPercents[k] ?? 0;
    if (i === ordered.length - 1) {
      amounts[k] = (totalPaise - allocatedPaise) / 100;
    } else {
      const paise = Math.floor((totalPaise * pct) / 100);
      amounts[k] = paise / 100;
      allocatedPaise += paise;
    }
  }
  return amounts;
}
