import type { HistoryTransaction } from "@/app/components/BalanceHistoryModal";
import type { PatiAeBudgetDto } from "@/lib/pati-ae-budget-types";
import { PATI_AE_MISC_LABEL } from "@/lib/pati-ae-categories";

export function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addLocalDays(d: Date, n: number): Date {
  const x = new Date(d.getTime());
  x.setDate(x.getDate() + n);
  return startOfLocalDay(x);
}

/** Local calendar key for persistence (user timezone). */
export function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Start of local calendar day of the most recent history txn, or today if none / invalid. */
export function latestHistoryDay(transactions: HistoryTransaction[]): Date {
  if (!transactions.length) return startOfLocalDay(new Date());
  let latest = new Date(0);
  for (const t of transactions) {
    const d = new Date(t.displayedAt);
    if (!Number.isNaN(d.getTime()) && d > latest) latest = d;
  }
  return latest.getTime() > 0
    ? startOfLocalDay(latest)
    : startOfLocalDay(new Date());
}

export function parseLocalDateKey(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const da = Number(m[3]);
  const d = new Date(y, mo - 1, da);
  if (
    d.getFullYear() !== y ||
    d.getMonth() !== mo - 1 ||
    d.getDate() !== da
  ) {
    return null;
  }
  return startOfLocalDay(d);
}

function dayIndexInPeriod(
  txDate: Date,
  periodStart: Date,
  n: number,
): number | null {
  const txDay = startOfLocalDay(txDate).getTime();
  const ps = periodStart.getTime();
  const diffDays = Math.round((txDay - ps) / 86_400_000);
  if (diffDays < 0 || diffDays >= n) return null;
  return diffDays;
}

function categoryForTx(
  tag: string,
  budgetCategories: Set<string>,
): string {
  const t = tag?.trim() || "";
  if (budgetCategories.has(t)) return t;
  if (budgetCategories.has(PATI_AE_MISC_LABEL)) return PATI_AE_MISC_LABEL;
  return PATI_AE_MISC_LABEL;
}

export type PatiAeChartSeries = {
  categories: string[];
  categoryColors: Record<string, string>;
  dayLabels: string[];
  /** [day][cat]: planned daily amount (₹) for chart column (today → end while active) */
  projected: number[][];
  /** [day][cat]: actual spend as shown (cumulative on “today” while period active) */
  actual: number[][];
  yMax: number;
  /** True when “now” (latest history day) is past the last day of the budget window */
  periodComplete: boolean;
  /** Whether to draw ideal/planned bars for column `d` */
  idealDayVisible: boolean[];
  /** True period totals from calendar-day buckets (for gauges, not display matrix) */
  totalSpentRaw: number;
  categorySpentRaw: Record<string, number>;
};

const CHART_PALETTE = [
  "#0ea5e9",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#6366f1",
  "#14b8a6",
  "#f97316",
  "#a855f7",
  "#06b6d4",
];

export function buildPatiAeChartSeries({
  savedBudget,
  transactions,
  /** Latest day in balance history (clamped in caller); drives “today” and ideal trimming */
  referenceNow,
}: {
  savedBudget: PatiAeBudgetDto;
  transactions: HistoryTransaction[];
  referenceNow: Date;
}): PatiAeChartSeries {
  const N = Math.max(1, Math.round(savedBudget.budgetDays));
  const anchorStr = savedBudget.periodAnchorDate?.trim();
  const periodStart =
    (anchorStr ? parseLocalDateKey(anchorStr) : null) ??
    startOfLocalDay(referenceNow);

  const today0 = startOfLocalDay(referenceNow);
  const diffToday = Math.round(
    (today0.getTime() - periodStart.getTime()) / 86_400_000,
  );
  const periodComplete = diffToday >= N;
  const beforePeriod = diffToday < 0;
  const todayIdx = beforePeriod
    ? -1
    : periodComplete
      ? N - 1
      : Math.min(diffToday, N - 1);

  const categories = Object.keys(savedBudget.categoryAmounts).sort((a, b) =>
    a.localeCompare(b),
  );
  const budgetCatSet = new Set(categories);
  const categoryColors: Record<string, string> = {};
  categories.forEach((c, i) => {
    categoryColors[c] = CHART_PALETTE[i % CHART_PALETTE.length];
  });

  const raw: number[][] = Array.from({ length: N }, () =>
    categories.map(() => 0),
  );

  for (const tx of transactions) {
    const at = new Date(tx.displayedAt);
    if (Number.isNaN(at.getTime())) continue;
    const di = dayIndexInPeriod(at, periodStart, N);
    if (di === null) continue;
    const cat = categoryForTx(tx.tag, budgetCatSet);
    const ci = categories.indexOf(cat);
    if (ci < 0) continue;
    raw[di][ci] += tx.amount;
  }

  const categorySpentRaw: Record<string, number> = {};
  let totalSpentRaw = 0;
  for (let ci = 0; ci < categories.length; ci++) {
    let s = 0;
    for (let d = 0; d < N; d++) s += raw[d][ci] ?? 0;
    const c = categories[ci];
    categorySpentRaw[c] = s;
    totalSpentRaw += s;
  }

  const noSpendYetInWindow = totalSpentRaw <= 0;

  const actual: number[][] = Array.from({ length: N }, () =>
    categories.map(() => 0),
  );
  const projected: number[][] = Array.from({ length: N }, () =>
    categories.map(() => 0),
  );
  const idealDayVisible: boolean[] = Array.from({ length: N }, () => false);

  if (periodComplete) {
    for (let d = 0; d < N; d++) {
      for (let ci = 0; ci < categories.length; ci++) {
        actual[d][ci] = raw[d][ci] ?? 0;
        projected[d][ci] = 0;
      }
      idealDayVisible[d] = false;
    }
  } else if (beforePeriod) {
    for (let ci = 0; ci < categories.length; ci++) {
      const c = categories[ci];
      const B = savedBudget.categoryAmounts[c] ?? 0;
      const even = N > 0 ? B / N : 0;
      for (let d = 0; d < N; d++) {
        projected[d][ci] = even;
        actual[d][ci] = 0;
        idealDayVisible[d] = true;
      }
    }
  } else if (noSpendYetInWindow) {
    for (let ci = 0; ci < categories.length; ci++) {
      const c = categories[ci];
      const B = savedBudget.categoryAmounts[c] ?? 0;
      const even = N > 0 ? B / N : 0;
      for (let d = 0; d < N; d++) {
        projected[d][ci] = even;
        actual[d][ci] = 0;
        idealDayVisible[d] = true;
      }
    }
  } else {
    const daysLeft = N - todayIdx;
    for (let ci = 0; ci < categories.length; ci++) {
      const c = categories[ci];
      const B = savedBudget.categoryAmounts[c] ?? 0;
      let spentThrough = 0;
      for (let j = 0; j <= todayIdx; j++) spentThrough += raw[j][ci] ?? 0;
      const remaining = Math.max(0, B - spentThrough);
      const dailyIdeal = daysLeft > 0 ? remaining / daysLeft : 0;

      for (let d = 0; d < N; d++) {
        if (d < todayIdx) {
          actual[d][ci] = 0;
        } else if (d === todayIdx) {
          let cum = 0;
          for (let j = 0; j <= todayIdx; j++) cum += raw[j][ci] ?? 0;
          actual[d][ci] = cum;
        } else {
          actual[d][ci] = raw[d][ci] ?? 0;
        }
        projected[d][ci] = d >= todayIdx ? dailyIdeal : 0;
        idealDayVisible[d] = d >= todayIdx;
      }
    }
  }

  const dayLabels = Array.from({ length: N }, (_, i) => {
    const dt = addLocalDays(periodStart, i);
    return dt.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  });

  let yMax = 1;
  for (let d = 0; d < N; d++) {
    const aTot = actual[d].reduce((s, v) => s + v, 0);
    yMax = Math.max(yMax, aTot);
    if (idealDayVisible[d]) {
      const pTot = projected[d].reduce((s, v) => s + v, 0);
      yMax = Math.max(yMax, pTot);
    }
  }

  return {
    categories,
    categoryColors,
    dayLabels,
    projected,
    actual,
    yMax,
    periodComplete,
    idealDayVisible,
    totalSpentRaw,
    categorySpentRaw,
  };
}
