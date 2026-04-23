"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PatiAeBudgetDto } from "@/lib/pati-ae-budget-types";
import { PATI_AE_MISC_LABEL } from "@/lib/pati-ae-categories";

function formatInr(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function clampIntPercent(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** Integer percents summing to 100 across editables (Misc stays 0). */
function equalIntegerPercents(editables: string[]): Record<string, number> {
  const n = editables.length;
  if (n === 0) return {};
  const base = Math.floor(100 / n);
  const rem = 100 % n;
  const out: Record<string, number> = {};
  for (let i = 0; i < n; i++) {
    out[editables[i]] = base + (i < rem ? 1 : 0);
  }
  return out;
}

type Props = {
  open: boolean;
  onClose: () => void;
  /** Split rows (Scan QR tags + transfers, etc.). Misc is not included — it is computed. */
  editableCategories: string[];
  savedBudget: PatiAeBudgetDto | null;
  onSaved: (b: PatiAeBudgetDto) => void;
  /** Updates sidebar calendar highlight while “Budget period (days)” changes */
  onPreviewBudgetDaysChange?: (days: number | null) => void;
  /** First day of the N-day window: latest balance-history date (`YYYY-MM-DD`) */
  periodAnchorDateOnSave: string;
};

export default function DraggableBudgetForm({
  open,
  onClose,
  editableCategories,
  savedBudget,
  onSaved,
  onPreviewBudgetDaysChange,
  periodAnchorDateOnSave,
}: Props) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const posRef = useRef(pos);
  posRef.current = pos;
  const drag = useRef<{
    pid: number;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const [incomeStr, setIncomeStr] = useState("");
  const [saveStr, setSaveStr] = useState("");
  const [budgetDaysStr, setBudgetDaysStr] = useState("30");
  const [percents, setPercents] = useState<Record<string, number>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPos({ x: 0, y: 0 });
    setSubmitError(null);
    const inc = savedBudget?.monthlyIncome;
    const sav = savedBudget?.monthlySave;
    const days = savedBudget?.budgetDays ?? 30;
    setIncomeStr(inc != null && inc > 0 ? String(inc) : "");
    setSaveStr(sav != null && sav >= 0 ? String(sav) : "");
    setBudgetDaysStr(String(days));

    const next: Record<string, number> = {};
    for (const c of editableCategories) {
      const p = savedBudget?.categoryPercents[c];
      next[c] =
        typeof p === "number" && Number.isFinite(p)
          ? clampIntPercent(p)
          : 0;
    }
    const sumEd = Object.values(next).reduce((a, b) => a + b, 0);
    const savedMisc = savedBudget?.categoryPercents[PATI_AE_MISC_LABEL];
    const miscSaved =
      typeof savedMisc === "number" && Number.isFinite(savedMisc)
        ? clampIntPercent(savedMisc)
        : 0;
    const total = sumEd + miscSaved;
    const validSaved =
      total === 100 &&
      sumEd <= 100 &&
      miscSaved >= 0 &&
      miscSaved <= 100;
    if (editableCategories.length > 0 && !validSaved) {
      Object.assign(next, equalIntegerPercents(editableCategories));
    }
    setPercents(next);
  }, [open, savedBudget, editableCategories]);

  useEffect(() => {
    if (!open || !onPreviewBudgetDaysChange) return;
    const d = Math.round(Number(budgetDaysStr) || 0);
    if (d >= 1 && d <= 31) onPreviewBudgetDaysChange(d);
    else onPreviewBudgetDaysChange(null);
  }, [open, budgetDaysStr, onPreviewBudgetDaysChange]);

  const income = Number(incomeStr);
  const saveAmt = Number(saveStr);
  const budgetDays = Math.round(Number(budgetDaysStr) || 0);

  /** Period spendable: (income − save) × (days ÷ 30), shown only when all three fields are valid. */
  const periodSpendableCaption = useMemo(() => {
    if (!incomeStr.trim() || !Number.isFinite(income) || income <= 0) return null;
    if (!saveStr.trim() || !Number.isFinite(saveAmt) || saveAmt < 0) return null;
    if (saveAmt >= income) return null;
    if (!budgetDaysStr.trim() || !Number.isFinite(budgetDays)) return null;
    if (budgetDays < 1 || budgetDays > 31) return null;
    const monthly = Math.max(0, income - saveAmt);
    const period = monthly * (budgetDays / 30);
    return formatInr(period);
  }, [
    incomeStr,
    saveStr,
    budgetDaysStr,
    income,
    saveAmt,
    budgetDays,
  ]);

  const sumEditable = useMemo(
    () =>
      editableCategories.reduce((s, c) => s + clampIntPercent(percents[c] ?? 0), 0),
    [editableCategories, percents],
  );

  const miscPercent = useMemo(
    () => clampIntPercent(100 - sumEditable),
    [sumEditable],
  );

  const onPointerDownHandle = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = {
      pid: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origX: posRef.current.x,
      origY: posRef.current.y,
    };
  }, []);

  const onPointerMoveHandle = useCallback((e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.pid) return;
    setPos({
      x: d.origX + (e.clientX - d.startX),
      y: d.origY + (e.clientY - d.startY),
    });
  }, []);

  const onPointerUpHandle = useCallback((e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.pid) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    drag.current = null;
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (!Number.isFinite(income) || income <= 0) {
      setSubmitError("Enter a valid monthly income.");
      return;
    }
    if (!Number.isFinite(saveAmt) || saveAmt < 0) {
      setSubmitError("Enter a valid amount to save.");
      return;
    }
    if (saveAmt >= income) {
      setSubmitError("Savings must be less than income.");
      return;
    }
    if (!Number.isFinite(budgetDays) || budgetDays < 1 || budgetDays > 31) {
      setSubmitError("Budget days must be between 1 and 31.");
      return;
    }
    if (editableCategories.length === 0) {
      setSubmitError("No categories to save.");
      return;
    }
    if (sumEditable > 100) {
      setSubmitError(
        "Category percents add up to more than 100%. Lower some values.",
      );
      return;
    }

    const categoryPercents: Record<string, number> = {};
    for (const c of editableCategories) {
      categoryPercents[c] = clampIntPercent(percents[c] ?? 0);
    }
    categoryPercents[PATI_AE_MISC_LABEL] = miscPercent;

    setSaving(true);
    try {
      const res = await fetch("/api/pati-ae/budget", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthlyIncome: income,
          monthlySave: saveAmt,
          budgetDays,
          categoryPercents,
          periodAnchorDate: periodAnchorDateOnSave,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(
          typeof data.error === "string" ? data.error : "Could not save budget",
        );
        return;
      }
      const b = data.budget as PatiAeBudgetDto | undefined;
      if (b) onSaved(b);
      onClose();
    } catch {
      setSubmitError("Network error");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[140] cursor-default bg-black/35"
        aria-label="Close budget form"
        onClick={onClose}
      />
      <div
        className="fixed right-[max(1rem,env(safe-area-inset-right))] top-[max(5rem,env(safe-area-inset-top))] z-[150] w-[min(100vw-2rem,26rem)] max-h-[min(85dvh,calc(100dvh-6rem))] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-[#e2e8f0]"
        style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pati-ae-budget-title"
      >
        <div
          data-drag-handle
          onPointerDown={onPointerDownHandle}
          onPointerMove={onPointerMoveHandle}
          onPointerUp={onPointerUpHandle}
          onPointerCancel={onPointerUpHandle}
          className="flex cursor-grab touch-none items-center justify-between border-b border-[#f1f5f9] bg-gradient-to-r from-[#e0f7fc] to-[#dbeafe] px-4 py-3 active:cursor-grabbing"
        >
          <h2
            id="pati-ae-budget-title"
            className="text-[15px] font-bold text-[#0f172a]"
          >
            Set budget
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[#64748b] hover:bg-white/60"
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="flex max-h-[min(72dvh,calc(100dvh-10rem))] flex-col overflow-y-auto p-4"
        >
          <label className="block">
            <span className="text-[12px] font-semibold text-[#475569]">
              Monthly income (₹)
            </span>
            <input
              type="number"
              min={0}
              step="1"
              inputMode="numeric"
              value={incomeStr}
              onChange={(e) => setIncomeStr(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#e2e8f0] px-3 py-2.5 text-[15px] outline-none ring-[#00baf2] focus:ring-2"
              placeholder="e.g. 50000"
              required
            />
          </label>

          <label className="mt-3 block">
            <span className="text-[12px] font-semibold text-[#475569]">
              I want to save this month (₹)
            </span>
            <input
              type="number"
              min={0}
              step="1"
              inputMode="numeric"
              value={saveStr}
              onChange={(e) => setSaveStr(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#e2e8f0] px-3 py-2.5 text-[15px] outline-none ring-[#00baf2] focus:ring-2"
              placeholder="e.g. 10000"
              required
            />
          </label>

          <label className="mt-4 block">
            <span className="text-[12px] font-semibold text-[#475569]">
              Budget period (days)
            </span>
            <input
              type="number"
              min={1}
              max={31}
              step={1}
              value={budgetDaysStr}
              onChange={(e) => setBudgetDaysStr(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#e2e8f0] px-3 py-2.5 text-[15px] outline-none ring-[#00baf2] focus:ring-2"
              required
            />
            {periodSpendableCaption ? (
              <p className="mt-1.5 text-[12px] font-semibold text-[#0284c7]">
                You can spend {periodSpendableCaption}
              </p>
            ) : null}
          </label>

          <p className="mt-4 text-[12px] font-bold text-[#0f172a]">
            Split by category (%)
          </p>

          <ul className="mt-2 space-y-2">
            {editableCategories.map((c) => (
              <li
                key={c}
                className="flex items-center justify-between gap-2 rounded-xl border border-[#f1f5f9] px-3 py-2"
              >
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#334155]">
                  {c}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    inputMode="numeric"
                    value={percents[c] ?? 0}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const v =
                        raw === "" ? 0 : clampIntPercent(parseInt(raw, 10));
                      setPercents((prev) => ({ ...prev, [c]: v }));
                    }}
                    className="w-[4.5rem] rounded-lg border border-[#e2e8f0] px-2 py-1.5 text-right text-[14px] outline-none focus:ring-2 focus:ring-[#00baf2]"
                  />
                  <span className="text-[13px] text-[#64748b]">%</span>
                </div>
              </li>
            ))}
            <li className="flex items-center justify-between gap-2 rounded-xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#475569]">
                {PATI_AE_MISC_LABEL}
                <span className="ml-1 text-[11px] font-normal text-[#94a3b8]">
                  (auto)
                </span>
              </span>
              <div className="flex shrink-0 items-center gap-1">
                <span className="w-[4.5rem] text-right text-[14px] font-semibold tabular-nums text-[#0369a1]">
                  {miscPercent}
                </span>
                <span className="text-[13px] text-[#64748b]">%</span>
              </div>
            </li>
          </ul>

          {submitError ? (
            <p className="mt-2 text-[12px] font-medium text-red-600">
              {submitError}
            </p>
          ) : null}

          <div className="sticky bottom-0 mt-4 flex gap-2 border-t border-[#f1f5f9] bg-white pt-3 pb-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-[#e2e8f0] py-2.5 text-[14px] font-bold text-[#475569]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || sumEditable > 100}
              className="flex-1 rounded-xl bg-[#00baf2] py-2.5 text-[14px] font-bold text-white shadow-sm disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save budget"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
