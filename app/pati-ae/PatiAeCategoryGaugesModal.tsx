"use client";

import { useEffect } from "react";
import PatiAeSpendGauge from "./PatiAeSpendGauge";

type Props = {
  open: boolean;
  onClose: () => void;
  categories: string[];
  categoryColors: Record<string, string>;
  categoryCap: Record<string, number>;
  categorySpent: Record<string, number>;
};

export default function PatiAeCategoryGaugesModal({
  open,
  onClose,
  categories,
  categoryColors,
  categoryCap,
  categorySpent,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[160] cursor-default bg-black/40"
        aria-label="Close category analysis"
        onClick={onClose}
      />
      <div
        className="fixed left-1/2 top-[max(1rem,env(safe-area-inset-top))] z-[170] max-h-[min(88dvh,calc(100dvh-2rem))] w-[min(calc(100vw-1.5rem),28rem)] -translate-x-1/2 overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-[#e2e8f0] sm:w-[min(calc(100vw-2rem),40rem)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pati-ae-cat-modal-title"
      >
        <div className="flex items-center justify-between border-b border-[#f1f5f9] bg-gradient-to-r from-[#e0f7fc] to-[#dbeafe] px-4 py-3">
          <h2
            id="pati-ae-cat-modal-title"
            className="text-[15px] font-bold text-[#0f172a]"
          >
            Category-wise spend
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[#64748b] hover:bg-white/70"
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
        <div className="max-h-[min(72dvh,560px)] overflow-y-auto p-4 sm:p-5">
          <p className="mb-4 text-[12px] leading-relaxed text-[#64748b]">
            Each gauge uses your budget allowance for that category in this
            period and the needle shows real payments so far.
          </p>
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {categories.map((c) => (
              <li
                key={c}
                className="rounded-xl border border-[#f1f5f9] bg-[#fafbfc] px-3 py-4 shadow-sm"
                style={{
                  borderTopColor: categoryColors[c] ?? "#e2e8f0",
                  borderTopWidth: 3,
                }}
              >
                <PatiAeSpendGauge
                  budgetMax={Math.max(0, categoryCap[c] ?? 0)}
                  spent={Math.max(0, categorySpent[c] ?? 0)}
                  label={c}
                  size="sm"
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
