"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { HistoryTransaction } from "@/app/components/BalanceHistoryModal";
import {
  PATI_AE_BUDGET_BASE_LABELS,
  PATI_AE_MISC_LABEL,
} from "@/lib/pati-ae-categories";
import type { PatiAeBudgetDto } from "@/lib/pati-ae-budget-types";
import {
  addLocalDays,
  buildPatiAeChartSeries,
  latestHistoryDay,
  localDateKey,
  parseLocalDateKey,
  startOfLocalDay,
} from "@/lib/pati-ae-chart-series";
import PatiAeBudgetChart from "./PatiAeBudgetChart";
import PatiAeCategoryGaugesModal from "./PatiAeCategoryGaugesModal";
import DraggableBudgetForm from "./DraggableBudgetForm";
import PatiAeSpendGauge from "./PatiAeSpendGauge";

function tagsFromTransactions(transactions: HistoryTransaction[]): string[] {
  const set = new Set<string>();
  for (const t of transactions) {
    if (t.tag && t.tag.trim()) set.add(t.tag.trim());
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

function monthsSpanningRange(start: Date, end: Date): { y: number; m: number }[] {
  const out: { y: number; m: number }[] = [];
  let cy = start.getFullYear();
  let cm = start.getMonth();
  const ey = end.getFullYear();
  const em = end.getMonth();
  for (;;) {
    out.push({ y: cy, m: cm });
    if (cy === ey && cm === em) break;
    cm += 1;
    if (cm > 11) {
      cm = 0;
      cy += 1;
    }
  }
  return out;
}

function cellDateMs(year: number, month: number, day: number): number {
  return new Date(year, month, day).getTime();
}

function CalendarMonthGrid({
  year,
  month,
  rangeStart,
  rangeEnd,
  periodStart,
  compact,
}: {
  year: number;
  month: number;
  rangeStart: Date | null;
  rangeEnd: Date | null;
  periodStart: Date;
  compact?: boolean;
}) {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const title = new Date(year, month, 1).toLocaleDateString("en-IN", {
    month: compact ? "short" : "long",
    year: "numeric",
  });

  const weekdays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const rs = rangeStart?.getTime() ?? null;
  const re = rangeEnd?.getTime() ?? null;
  const ps = periodStart.getTime();

  const wrap = compact
    ? "rounded-xl bg-white p-2 shadow-sm ring-1 ring-[#e0f2fe]"
    : "rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#e0f2fe]";
  const titleCls = compact
    ? "text-center text-[10px] font-bold text-[#0f172a]"
    : "text-center text-[16px] font-bold text-[#0f172a]";
  const headCls = compact
    ? "mt-1.5 grid grid-cols-7 gap-0.5 text-center text-[7px] font-semibold text-[#94a3b8]"
    : "mt-4 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-[#94a3b8]";
  const gridCls = compact
    ? "mt-0.5 grid grid-cols-7 gap-0.5"
    : "mt-1 grid grid-cols-7 gap-1";
  const baseCell = compact
    ? "flex aspect-square min-h-0 items-center justify-center rounded-md text-[8px] font-medium tabular-nums text-[#334155]"
    : "flex aspect-square items-center justify-center rounded-lg text-[13px] font-medium tabular-nums text-[#334155]";
  const startCell = compact
    ? "flex aspect-square min-h-0 items-center justify-center rounded-md bg-[#00baf2] text-[8px] font-bold tabular-nums text-white shadow-inner"
    : "flex aspect-square items-center justify-center rounded-lg bg-[#00baf2] text-[13px] font-bold tabular-nums text-white shadow-inner";
  const rangeCell = compact
    ? "flex aspect-square min-h-0 items-center justify-center rounded-md bg-sky-300 text-[8px] font-semibold tabular-nums text-[#0c4a6e]"
    : "flex aspect-square items-center justify-center rounded-lg bg-sky-300 text-[13px] font-semibold tabular-nums text-[#0c4a6e]";

  return (
    <div className={wrap}>
      <p className={titleCls}>{title}</p>
      <div className={headCls}>
        {weekdays.map((w, i) => (
          <div key={`${w}-${i}`} className={compact ? "py-0.5" : "py-1"}>
            {w}
          </div>
        ))}
      </div>
      <div className={gridCls}>
        {cells.map((d, i) => {
          if (d === null) {
            return (
              <div
                key={`e-${i}`}
                className={compact ? "aspect-square min-h-0" : "aspect-square"}
              />
            );
          }
          const t = cellDateMs(year, month, d);
          const inBudgetRange =
            rs != null && re != null && t >= rs && t <= re;
          const isPeriodStart = t === ps;

          let cellClass = baseCell;
          if (inBudgetRange) {
            cellClass = isPeriodStart ? startCell : rangeCell;
          }

          return (
            <div key={d} className={cellClass}>
              {d}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Highlights the saved period anchor through day N of the budget window. */
function BudgetCalendarMonths({
  anchor,
  budgetDays,
  compact,
}: {
  anchor: Date;
  budgetDays: number | null;
  compact?: boolean;
}) {
  const periodStart = startOfLocalDay(anchor);
  const n = budgetDays;
  const hasRange =
    typeof n === "number" && Number.isFinite(n) && n >= 1;
  const rangeEnd = hasRange ? addLocalDays(periodStart, n - 1) : null;

  const monthSpecs = hasRange && rangeEnd
    ? monthsSpanningRange(periodStart, rangeEnd)
    : [{ y: periodStart.getFullYear(), m: periodStart.getMonth() }];

  return (
    <div className={compact ? "space-y-2" : "space-y-4"}>
      {monthSpecs.map(({ y, m }) => (
        <CalendarMonthGrid
          key={`${y}-${m}`}
          year={y}
          month={m}
          rangeStart={hasRange ? periodStart : null}
          rangeEnd={hasRange ? rangeEnd : null}
          periodStart={periodStart}
          compact={compact}
        />
      ))}
    </div>
  );
}

export default function PatiAeClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<HistoryTransaction[]>([]);
  const [savedBudget, setSavedBudget] = useState<PatiAeBudgetDto | null>(null);
  const [budgetFormOpen, setBudgetFormOpen] = useState(false);
  const [categoryGaugesOpen, setCategoryGaugesOpen] = useState(false);
  /** Live calendar range while the budget form is open (days field). */
  const [previewBudgetDays, setPreviewBudgetDays] = useState<number | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [histRes, budgetRes] = await Promise.all([
        fetch("/api/balance-history", { credentials: "include" }),
        fetch("/api/pati-ae/budget", { credentials: "include" }),
      ]);
      const histData = await histRes.json().catch(() => ({}));
      if (!histRes.ok) {
        throw new Error(
          typeof histData.error === "string" ? histData.error : "Failed to load",
        );
      }
      setTransactions(
        Array.isArray(histData.transactions) ? histData.transactions : [],
      );

      if (budgetRes.ok) {
        const bData = await budgetRes.json().catch(() => ({}));
        const b = bData.budget as PatiAeBudgetDto | null | undefined;
        setSavedBudget(b && typeof b === "object" ? b : null);
      } else {
        setSavedBudget(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setTransactions([]);
      setSavedBudget(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!budgetFormOpen) setPreviewBudgetDays(null);
  }, [budgetFormOpen]);

  const refreshBudgetFromDb = useCallback(async () => {
    try {
      const budgetRes = await fetch("/api/pati-ae/budget", {
        credentials: "include",
      });
      if (!budgetRes.ok) return;
      const bData = await budgetRes.json().catch(() => ({}));
      const b = bData.budget as PatiAeBudgetDto | null | undefined;
      setSavedBudget(b && typeof b === "object" ? b : null);
    } catch {
      /* ignore */
    }
  }, []);

  const openBudgetForm = useCallback(async () => {
    await refreshBudgetFromDb();
    setBudgetFormOpen(true);
  }, [refreshBudgetFromDb]);

  /** Calendar anchor for sidebar: saved period start, or latest history day if missing / no budget. */
  const budgetCalendarAnchor = useMemo(() => {
    const key = savedBudget?.periodAnchorDate?.trim();
    if (key) {
      const d = parseLocalDateKey(key);
      if (d) return d;
    }
    return latestHistoryDay(transactions);
  }, [savedBudget?.periodAnchorDate, transactions]);

  /** PatiAe “now”: same calendar day as the latest balance-history transaction (or today if none). */
  const historyReferenceDay = useMemo(
    () => latestHistoryDay(transactions),
    [transactions],
  );

  /** Editable split rows: all Scan-QR tags (except auto Misc) + transfers + any tags from history/saved. */
  const editableBudgetCategories = useMemo(() => {
    const set = new Set<string>([...PATI_AE_BUDGET_BASE_LABELS]);
    for (const t of tagsFromTransactions(transactions)) {
      if (t === PATI_AE_MISC_LABEL) continue;
      if (t.trim()) set.add(t);
    }
    if (savedBudget) {
      for (const k of Object.keys(savedBudget.categoryPercents)) {
        if (k === PATI_AE_MISC_LABEL) continue;
        set.add(k);
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [transactions, savedBudget]);

  const chartSeries = useMemo(() => {
    if (!savedBudget) return null;
    return buildPatiAeChartSeries({
      savedBudget,
      transactions,
      referenceNow: historyReferenceDay,
    });
  }, [savedBudget, transactions, historyReferenceDay]);

  const spendMetrics = useMemo(() => {
    if (!chartSeries || !savedBudget) return null;
    const totalCap = chartSeries.categories.reduce(
      (s, c) => s + (savedBudget.categoryAmounts[c] ?? 0),
      0,
    );
    const totalSpent = chartSeries.totalSpentRaw;
    const categorySpent = { ...chartSeries.categorySpentRaw };
    return {
      totalCap,
      totalSpent,
      categorySpent,
      categoryCap: savedBudget.categoryAmounts,
      categories: chartSeries.categories,
      categoryColors: chartSeries.categoryColors,
    };
  }, [chartSeries, savedBudget]);

  const calendarHighlightDays = useMemo(() => {
    if (budgetFormOpen) {
      if (
        previewBudgetDays != null &&
        previewBudgetDays >= 1 &&
        previewBudgetDays <= 31
      ) {
        return previewBudgetDays;
      }
      if (
        savedBudget != null &&
        typeof savedBudget.budgetDays === "number" &&
        savedBudget.budgetDays >= 1
      ) {
        return savedBudget.budgetDays;
      }
      return null;
    }
    if (
      savedBudget != null &&
      typeof savedBudget.budgetDays === "number" &&
      savedBudget.budgetDays >= 1
    ) {
      return savedBudget.budgetDays;
    }
    return null;
  }, [budgetFormOpen, previewBudgetDays, savedBudget]);

  return (
    <div className="min-h-dvh bg-gradient-to-b from-[#e0f7fc] via-[#f0f9ff] to-[#f8fafc]">
      <header className="sticky top-0 z-30 border-b border-[#bae6fd]/80 bg-[#e0f7fc]/95 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#0f172a] hover:bg-black/5"
            aria-label="Back to home"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 6l-6 6 6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-[18px] font-bold text-[#0f172a] sm:text-[20px]">
              PatiAe
            </h1>
            <p className="truncate text-[12px] text-[#64748b] sm:text-[13px]">
              Budget planner tied to your payment timeline
            </p>
          </div>
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#00baf2] to-[#0284c7] text-[11px] font-bold text-white shadow-sm"
            aria-hidden
          >
            AI
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 pb-16 lg:flex-row lg:items-start lg:gap-8 sm:px-6">
        <aside className="mx-auto w-full max-w-[228px] shrink-0 space-y-3 lg:mx-0">
          <button
            type="button"
            onClick={() => void openBudgetForm()}
            className="w-full rounded-xl bg-gradient-to-r from-[#00baf2] to-[#0284c7] py-2.5 text-[13px] font-bold text-white shadow-md transition hover:brightness-105"
          >
            Set budget
          </button>

          {loading ? (
            <p className="text-center text-xs text-[#64748b]">Loading…</p>
          ) : error ? (
            <div className="rounded-xl bg-white p-3 text-xs text-red-600 ring-1 ring-red-100">
              {error}
              <Link
                href="/"
                className="mt-2 block text-center font-bold text-[#0284c7]"
              >
                Go home
              </Link>
            </div>
          ) : (
            <>
              <BudgetCalendarMonths
                anchor={budgetCalendarAnchor}
                budgetDays={calendarHighlightDays}
                compact
              />
              {spendMetrics ? (
                <div className="rounded-xl bg-white px-2.5 py-3 shadow-sm ring-1 ring-[#e0f2fe]">
                  <button
                    type="button"
                    onClick={() => setCategoryGaugesOpen(true)}
                    className="w-full text-left transition hover:opacity-90"
                  >
                    <p className="text-[11px] font-bold leading-snug text-[#0369a1] underline decoration-[#7dd3fc] decoration-2 underline-offset-2">
                      Analyse category wise payments
                    </p>
                    <p className="mt-1 text-[9px] font-medium text-[#94a3b8]">
                      Open breakdown by category
                    </p>
                  </button>
                  <div className="mt-2 border-t border-[#f1f5f9] pt-2">
                    <PatiAeSpendGauge
                      budgetMax={Math.max(1, spendMetrics.totalCap)}
                      spent={spendMetrics.totalSpent}
                      size="md"
                    />
                  </div>
                  <p className="mt-1 text-center text-[9px] text-[#64748b]">
                    Period spend vs budget cap · “Now”{" "}
                    {historyReferenceDay.toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    (latest history date)
                  </p>
                </div>
              ) : savedBudget ? null : (
                <p className="text-center text-[10px] text-[#64748b]">
                  Set a budget to see your spend gauge.
                </p>
              )}
            </>
          )}
        </aside>

        <main className="min-w-0 flex-1">
          {loading || error ? null : chartSeries ? (
            <PatiAeBudgetChart
              series={chartSeries}
              title="Spend: plan vs actual"
            />
          ) : (
            <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#bae6fd] bg-white/60 px-6 py-12 text-center">
              <p className="max-w-md text-[15px] font-semibold text-[#0f172a]">
                No budget yet
              </p>
              <p className="mt-2 max-w-md text-[13px] leading-relaxed text-[#64748b]">
                Use{" "}
                <span className="font-semibold text-[#0369a1]">Set budget</span>{" "}
                to add your plan. You&apos;ll see a stacked chart here: faint
                bars for daily targets (they rebalance after each spend), and
                solid bars for what you actually paid—updated from your
                transactions.
              </p>
            </div>
          )}
        </main>
      </div>

      <DraggableBudgetForm
        open={budgetFormOpen}
        onClose={() => setBudgetFormOpen(false)}
        editableCategories={editableBudgetCategories}
        savedBudget={savedBudget}
        onSaved={(b) => setSavedBudget(b)}
        onPreviewBudgetDaysChange={setPreviewBudgetDays}
        periodAnchorDateOnSave={localDateKey(historyReferenceDay)}
      />

      {spendMetrics ? (
        <PatiAeCategoryGaugesModal
          open={categoryGaugesOpen}
          onClose={() => setCategoryGaugesOpen(false)}
          categories={spendMetrics.categories}
          categoryColors={spendMetrics.categoryColors}
          categoryCap={spendMetrics.categoryCap}
          categorySpent={spendMetrics.categorySpent}
        />
      ) : null}
    </div>
  );
}
