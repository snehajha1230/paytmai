"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AvatarBubble,
  formatInrAmount,
  VerifiedBadge,
} from "@/app/components/pay-flow-shared";
import type { PayAnyoneContact } from "@/lib/payee-types";

type RecentRow = PayAnyoneContact & {
  transactionId: string;
  contactId: string;
  amount: number;
  sentAt: string;
  isQr?: boolean;
};

function ChevronRight({ className = "" }: { className?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      className={`shrink-0 text-[#9ca3af] ${className}`}
      aria-hidden
    >
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BankBuildingIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        fill="#0284c7"
        d="M12 2L3 7v2h18V7L12 2zm-7 9v9H6v-2h2v2h8v-2h2v2h1v-9H5zm2 2h2v5H7v-5zm4 0h2v5h-2v-5zm4 0h2v5h-2v-5zM4 22h16v-2H4v2z"
      />
    </svg>
  );
}

function UpiMiniLogos() {
  return (
    <div className="flex items-center justify-center gap-0.5">
      <span className="rounded bg-[#5f259f] px-[3px] py-[1px] text-[5px] font-bold leading-none text-white">
        P
      </span>
      <span className="flex rounded bg-white px-[2px] py-[1px] text-[4px] font-bold leading-none shadow-sm ring-1 ring-[#e5e7eb]">
        <span className="text-[#4285f4]">G</span>
        <span className="text-[#34a853]">P</span>
      </span>
      <span className="rounded bg-[#00a651] px-[3px] py-[1px] text-[5px] font-bold leading-none text-white">
        B
      </span>
    </div>
  );
}

function SelfTransferIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle
        cx="12"
        cy="8"
        r="3"
        stroke="#0284c7"
        strokeWidth="1.5"
      />
      <path
        stroke="#0284c7"
        strokeWidth="1.5"
        strokeLinecap="round"
        d="M6 20v-1a6 6 0 016-6h.5"
      />
      <path
        stroke="#0284c7"
        strokeWidth="1.5"
        strokeLinecap="round"
        d="M17 14a3 3 0 110 3.5M17 17v3"
      />
    </svg>
  );
}

function formatSentSnippet(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const yest = new Date(now);
    yest.setDate(yest.getDate() - 1);
    const sameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
    if (sameDay(d, now)) return "Sent today";
    if (sameDay(d, yest)) return "Sent yesterday";
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

function ActionCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#e8eaed] bg-white shadow-sm">
      <div className="flex w-full items-start gap-3 p-4 text-left">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#e0f2fe]">
          {icon}
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-[15px] font-bold text-[#111]">{title}</p>
          <p className="mt-1 text-[12px] leading-snug text-[#64748b]">
            {subtitle}
          </p>
        </div>
        <ChevronRight className="mt-3" />
      </div>
      {children}
    </div>
  );
}

export default function BankTransferModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [contacts, setContacts] = useState<PayAnyoneContact[]>([]);
  const [recent, setRecent] = useState<RecentRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/contacts", { credentials: "include" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Failed to load");
      }
      const data = (await res.json()) as {
        contacts: PayAnyoneContact[];
        recent: RecentRow[];
      };
      setContacts(data.contacts);
      setRecent(data.recent);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load");
      setContacts([]);
      setRecent([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const beneficiaryRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const fromRecent = recent.filter((r) => !r.isQr);
    const base =
      fromRecent.length > 0
        ? fromRecent
        : contacts.map((c) => ({
            ...c,
            transactionId: `saved-${c.id}`,
            contactId: c.id,
            amount: 0,
            sentAt: "",
          }));
    if (!q) return base;
    return base.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        row.identifier.toLowerCase().includes(q),
    );
  }, [recent, contacts, query]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bank-transfer-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close overlay"
        onClick={onClose}
      />
      <div
        className="relative flex max-h-[100dvh] w-full max-w-[440px] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-h-[min(90vh,820px)] sm:rounded-[24px]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="shrink-0 border-b border-[#f1f5f9] px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
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
              id="bank-transfer-title"
              className="text-[17px] font-bold leading-snug text-[#111]"
            >
              Send Money to Any Bank A/c
            </h2>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-4 sm:px-5">
          <div className="flex flex-col gap-3">
            <ActionCard
              icon={<BankBuildingIcon />}
              title="Enter Bank A/c no & IFSC"
              subtitle="Send money to any Bank instantly"
            />
            <ActionCard
              icon={<UpiMiniLogos />}
              title="Enter UPI ID/Mobile Number"
              subtitle="Send money to Gpay, Phonepe, Bhim or any UPI app"
            />
            <ActionCard
              icon={<SelfTransferIcon />}
              title="Self Transfer"
              subtitle="Select A/c where you want to send money"
            >
              <div className="border-t border-[#f1f5f9] px-4 pb-4">
                <div className="mt-2 flex w-full cursor-default items-center gap-3 rounded-xl py-2">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1e40af] text-[10px] font-bold text-white">
                    SBI
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold text-[#111]">
                      State Bank Of India-6152
                    </p>
                    <p className="mt-0.5 text-[13px] font-semibold text-[#2563eb]">
                      Check balance
                    </p>
                  </div>
                  <ChevronRight />
                </div>
                <p className="mt-2 text-[14px] font-semibold text-[#2563eb]">
                  + Add another Bank A/c
                </p>
              </div>
            </ActionCard>
          </div>

          <h3 className="mt-8 text-[15px] font-bold text-[#111]">
            Recents &amp; Saved Beneficiaries
          </h3>
          <div className="relative mt-3">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
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
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Name, Mobile, UPI ID or Bank A/c"
              className="w-full rounded-2xl border border-[#e8eaed] bg-[#f8fafc] py-3 pl-10 pr-3 text-[14px] outline-none ring-0 placeholder:text-[#9ca3af] focus:border-[#00baf2] focus:bg-white"
            />
          </div>

          {loadError ? (
            <p className="mt-6 text-center text-sm text-red-600">{loadError}</p>
          ) : loading ? (
            <p className="mt-6 text-center text-sm text-[#64748b]">Loading…</p>
          ) : beneficiaryRows.length === 0 ? (
            <p className="mt-6 text-center text-sm text-[#64748b]">
              No beneficiaries match your search.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-[#eef0f3] rounded-2xl border border-[#eef0f3] bg-white shadow-sm">
              {beneficiaryRows.map((row) => (
                <li
                  key={row.transactionId}
                  className="flex items-stretch divide-x divide-[#e8eaed]"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3">
                    <AvatarBubble contact={row} size={44} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="truncate font-semibold text-[#111]">
                          {row.name}
                        </span>
                        {row.verified ? <VerifiedBadge /> : null}
                      </div>
                      <p className="truncate text-[12px] text-[#666]">
                        {row.identifier}
                      </p>
                      {row.sentAt ? (
                        <p className="mt-0.5 text-[12px] text-[#15803d]">
                          <span className="mr-0.5">₹</span>
                          {formatInrAmount(row.amount)}{" "}
                          {formatSentSnippet(row.sentAt)}
                        </p>
                      ) : (
                        <p className="mt-0.5 text-[12px] text-[#64748b]">
                          Saved beneficiary
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex w-12 shrink-0 items-center justify-center text-[#f59e0b]">
                    {row.favorite ? "★" : "☆"}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
