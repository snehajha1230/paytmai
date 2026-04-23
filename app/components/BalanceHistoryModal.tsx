"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

export type HistoryTransaction = {
  id: string;
  contactId: string;
  name: string;
  identifierType: "phone" | "upi";
  identifier: string;
  initials: string;
  avatarColor: string;
  avatarImageUrl: string | null;
  verified: boolean;
  amount: number;
  displayedAt: string;
  tag: string;
};

function formatInrAmount(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(n);
}

function formatSentLine(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const yest = new Date(now);
    yest.setDate(yest.getDate() - 1);
    const sameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
    const timeStr = d.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    if (sameDay(d, now)) return `Sent today, ${timeStr}`;
    if (sameDay(d, yest)) return `Sent yesterday, ${timeStr}`;
    const dateStr = d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
    return `Sent on ${dateStr}, ${timeStr}`;
  } catch {
    return "";
  }
}

function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}`;
}

function monthLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function AvatarBubble({
  tx,
  size = 48,
  className = "",
}: {
  tx: Pick<
    HistoryTransaction,
    "initials" | "avatarColor" | "avatarImageUrl" | "name"
  >;
  size?: number;
  className?: string;
}) {
  if (tx.avatarImageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={tx.avatarImageUrl}
        alt=""
        width={size}
        height={size}
        className={`rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className={`flex items-center justify-center rounded-full text-[14px] font-bold text-[#1e1b4b] ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: tx.avatarColor,
      }}
    >
      {tx.initials}
    </div>
  );
}

function VerifiedBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex h-[16px] w-[16px] items-center justify-center rounded-full bg-[#2563eb] text-[9px] font-bold text-white ${className}`}
      aria-label="Verified"
    >
      ✓
    </span>
  );
}

export default function BalanceHistoryModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<HistoryTransaction[]>([]);
  const [sbiBalance, setSbiBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const router = useRouter();

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/balance-history", {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Failed to load",
        );
      }
      setTransactions(
        Array.isArray(data.transactions) ? data.transactions : [],
      );
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load");
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBalance = useCallback(async () => {
    setBalanceLoading(true);
    setBalanceError(null);
    try {
      const res = await fetch("/api/account/balance", {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Failed to load balance",
        );
      }
      if (typeof data.accountBalance === "number") {
        setSbiBalance(data.accountBalance);
      }
    } catch (e) {
      setBalanceError(
        e instanceof Error ? e.message : "Could not load balance",
      );
    } finally {
      setBalanceLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      void loadHistory();
      setSbiBalance(null);
      setBalanceError(null);
    }
  }, [open, loadHistory]);

  const groups = useMemo(() => {
    const map = new Map<
      string,
      { label: string; total: number; items: HistoryTransaction[] }
    >();
    for (const t of transactions) {
      const key = monthKey(t.displayedAt);
      const g = map.get(key);
      if (g) {
        g.total += t.amount;
        g.items.push(t);
      } else {
        map.set(key, {
          label: monthLabel(t.displayedAt),
          total: t.amount,
          items: [t],
        });
      }
    }
    return Array.from(map.entries()).map(([, v]) => v);
  }, [transactions]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="balance-history-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close overlay"
        onClick={onClose}
      />
      <div
        className="relative flex max-h-[100dvh] w-full max-w-[440px] flex-col overflow-hidden rounded-t-3xl bg-[#e8f4fc] shadow-2xl sm:max-h-[min(90vh,820px)] sm:rounded-[24px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 bg-gradient-to-b from-[#b8e5f7] via-[#d4eef9] to-[#e8f4fc] px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full text-[#111] hover:bg-black/5"
              aria-label="Back"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M15 6l-6 6 6 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <h2
              id="balance-history-title"
              className="text-[17px] font-bold text-[#111]"
            >
              Balance &amp; History
            </h2>
          </div>

          <p className="mt-4 text-[13px] font-bold text-[#333]">
            Your Accounts
          </p>
          <div className="hide-scrollbar mt-2 flex gap-3 overflow-x-auto pb-2">
            <div className="relative w-[min(88vw,300px)] shrink-0 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbeafe]">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[15px] font-bold text-[#111]">SBI Bank</p>
                  <p className="mt-0.5 text-[12px] text-[#64748b]">
                    A/c No: 6152
                  </p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1e40af] text-[10px] font-bold text-white">
                  SBI
                </div>
              </div>
              {balanceError ? (
                <p className="mt-2 text-[11px] text-red-600">{balanceError}</p>
              ) : null}
              {sbiBalance !== null ? (
                <p className="mt-2 text-[14px] font-semibold text-[#0f172a]">
                  ₹{formatInrAmount(sbiBalance)}
                </p>
              ) : null}
              <button
                type="button"
                disabled={balanceLoading}
                onClick={() => void fetchBalance()}
                className="mt-3 w-full rounded-xl bg-[#7dd3fc] py-2.5 text-[14px] font-bold text-[#0c4a6e] shadow-sm disabled:opacity-60"
              >
                {balanceLoading ? "Checking…" : "Check Balance"}
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                router.push("/pati-ae");
              }}
              className="relative w-[min(88vw,300px)] shrink-0 overflow-hidden rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-[#bae6fd] transition hover:ring-2 hover:ring-[#00baf2]/40"
            >
              <div className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-[#00baf2]/15" />
              <div className="pointer-events-none absolute -bottom-4 -left-4 h-16 w-16 rounded-full bg-[#38bdf8]/20" />
              <div className="relative flex items-start justify-between gap-2">
                <div>
                  <p className="text-[15px] font-bold text-[#0f172a]">PatiAe</p>
                  <p className="mt-0.5 text-[12px] leading-snug text-[#64748b]">
                    Budget, charts &amp; spending insights
                  </p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#00baf2] to-[#0284c7] text-[10px] font-bold text-white shadow-sm">
                  AI
                </div>
              </div>
              <span className="relative mt-3 flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#e0f7fc] to-[#dbeafe] py-2.5 text-[13px] font-bold text-[#0369a1]">
                Open PatiAe
              </span>
            </button>

            <div className="w-[min(72vw,260px)] shrink-0 rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-[#e2e8f0]">
              <p className="text-[15px] font-bold text-[#111]">UPI Lite</p>
              <p className="mt-1 text-[11px] leading-snug text-[#64748b]">
                2x Gold Coins on all payments
              </p>
              <button
                type="button"
                className="mt-3 w-full rounded-xl border border-[#cbd5e1] py-2 text-[13px] font-bold text-[#475569]"
              >
                Activate
              </button>
            </div>

            <button
              type="button"
              className="flex w-[120px] shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#94a3b8] bg-white/50 py-6 text-[12px] font-semibold text-[#64748b]"
            >
              <span className="text-2xl leading-none text-[#00baf2]">+</span>
              Add Paytm Postpaid
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col rounded-t-3xl bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
          <div className="flex shrink-0 items-center justify-between border-b border-[#f1f5f9] px-4 py-3 sm:px-5">
            <span className="text-[15px] font-bold text-[#111]">
              Payment History
            </span>
            <div className="flex items-center gap-3 text-[#64748b]">
              <span className="sr-only">Search, filter, download</span>
              <button
                type="button"
                className="rounded-lg p-1.5 hover:bg-[#f8fafc]"
                aria-label="Search"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle
                    cx="11"
                    cy="11"
                    r="7"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                  <path
                    d="M16 16l4 4"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                className="rounded-lg p-1.5 hover:bg-[#f8fafc]"
                aria-label="Filter"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M4 6h16M7 12h10M10 18h4"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                className="rounded-lg p-1.5 hover:bg-[#f8fafc]"
                aria-label="Download"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 4v12m0 0l4-4m-4 4l-4-4M5 20h14"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-0 pb-8">
            {loadError ? (
              <p className="px-4 py-8 text-center text-sm text-red-600">
                {loadError}
              </p>
            ) : loading ? (
              <p className="px-4 py-8 text-center text-sm text-[#64748b]">
                Loading…
              </p>
            ) : transactions.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-[#64748b]">
                No payments yet. Send money to see history here.
              </p>
            ) : (
              groups.map((g) => (
                <div key={g.label}>
                  <div className="flex items-center justify-between bg-[#f8fafc] px-4 py-2.5 sm:px-5">
                    <span className="text-[13px] font-semibold text-[#334155]">
                      {g.label}
                    </span>
                    <span className="text-[12px] text-[#64748b]">
                      Total Spent{" "}
                      <span className="font-bold text-[#111]">
                        ₹{formatInrAmount(g.total)}
                      </span>
                    </span>
                  </div>
                  <ul className="divide-y divide-[#f1f5f9]">
                    {g.items.map((t) => (
                      <li
                        key={t.id}
                        className="flex items-stretch gap-3 px-4 py-3 sm:px-5"
                      >
                        <AvatarBubble tx={t} size={48} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <span className="truncate font-semibold text-[#111]">
                              {t.name}
                            </span>
                            {t.verified ? <VerifiedBadge /> : null}
                          </div>
                          <p className="mt-0.5 text-[12px] text-[#64748b]">
                            {formatSentLine(t.displayedAt)}
                          </p>
                          <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-[#dcfce7] px-2 py-0.5 text-[10px] font-semibold text-[#166534]">
                            <span aria-hidden>↗</span>
                            {t.tag}
                          </span>
                        </div>
                        <div className="flex shrink-0 flex-col items-end justify-between py-0.5">
                          <span className="text-[15px] font-bold tabular-nums text-[#111]">
                            − ₹{formatInrAmount(t.amount)}
                          </span>
                          <div
                            className="flex h-7 w-7 items-center justify-center rounded-md bg-[#1e40af] text-[8px] font-bold text-white"
                            title="SBI Bank"
                          >
                            SBI
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
