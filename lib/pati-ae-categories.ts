import { QR_TAG_OPTIONS } from "@/lib/qr-payee";

/** Match balance-history `formatCategoryLabel` for QR tags. */
export function formatPatiAeCategoryLabel(tag: string): string {
  return tag
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Scan-QR split labels (same as payment flow), excluding misc — Misc is auto-filled in PatiAe. */
export const PATI_AE_QR_CATEGORY_LABELS: readonly string[] = QR_TAG_OPTIONS.filter(
  (t) => t !== "misc",
).map((t) => formatPatiAeCategoryLabel(t));

export const PATI_AE_MISC_LABEL = "Misc";

/** QR categories plus common non-QR payment types for the budget split. */
export const PATI_AE_BUDGET_BASE_LABELS: readonly string[] = [
  ...PATI_AE_QR_CATEGORY_LABELS,
  "Bill Payment",
  "Money Transfer",
];
