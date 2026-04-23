/** Shared shape for PatiAe budget (API + client). */
export type PatiAeBudgetDto = {
  monthlyIncome: number;
  monthlySave: number;
  categoryPercents: Record<string, number>;
  /** Planned expenditure (₹) per category for the budget period */
  categoryAmounts: Record<string, number>;
  budgetDays: number;
  /** Local calendar start of the N-day window (`YYYY-MM-DD`). Set when budget is saved. */
  periodAnchorDate?: string;
};
