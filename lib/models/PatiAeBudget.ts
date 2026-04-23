import { Schema } from "mongoose";

/**
 * Embedded PatiAe budget on User (`patiAeBudget`).
 * Holds income, savings goal, period length, category % split, and planned INR per category for the period.
 */
export const PatiAeBudgetSchema = new Schema(
  {
    monthlyIncome: { type: Number, required: true },
    monthlySave: { type: Number, required: true },
    /** Category label → percent (0–100), sums to 100 */
    categoryPercents: { type: Map, of: Number, required: true },
    /** Category label → planned spend (₹) for this budget period */
    categoryAmounts: { type: Map, of: Number, required: true },
    /** Scales spendable as (income − save) × (budgetDays / 30) */
    budgetDays: { type: Number, default: 30 },
    /** First day of budget window in the user’s local calendar (YYYY-MM-DD) */
    periodAnchorDate: { type: String, required: false },
  },
  { _id: false },
);
