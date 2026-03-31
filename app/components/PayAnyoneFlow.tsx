"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { rupeesLine } from "@/lib/rupees-to-words";

export type PayAnyoneContact = {
  id: string;
  name: string;
  identifierType: "phone" | "upi";
  identifier: string;
  initials: string;
  avatarColor: string;
  avatarImageUrl: string | null;
  verified: boolean;
  starredSuggestion: boolean;
  favorite: boolean;
};

type RecentRow = PayAnyoneContact & {
  transactionId: string;
  contactId: string;
  amount: number;
  sentAt: string;
};

type Step = "list" | "amount" | "pin" | "success";

function formatInrAmount(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(n);
}

function formatSentDay(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return "";
  }
}

function UpiAppLogos() {
  return (
    <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-[11px] text-[#555]">
      <span>to any UPI app</span>
      <div className="flex items-center gap-1.5">
        <span className="rounded bg-[#00baf2] px-1.5 py-0.5 text-[9px] font-bold text-white">
          Paytm
        </span>
        <span className="rounded bg-[#5f259f] px-1.5 py-0.5 text-[9px] font-bold text-white">
          PhonePe
        </span>
        <span className="flex items-center rounded bg-white px-1 py-0.5 text-[9px] font-bold shadow-sm ring-1 ring-[#e5e7eb]">
          <span className="text-[#4285f4]">G</span>
          <span className="text-[#ea4335]">o</span>
          <span className="text-[#fbbc05]">o</span>
          <span className="text-[#4285f4]">g</span>
          <span className="text-[#34a853]">l</span>
          <span className="text-[#ea4335]">e</span>
          <span className="ml-0.5 text-[#333]">Pay</span>
        </span>
        <span className="rounded bg-[#00a651] px-1.5 py-0.5 text-[9px] font-bold text-white">
          BHIM
        </span>
      </div>
    </div>
  );
}

function AvatarBubble({
  contact,
  size = 56,
  className = "",
}: {
  contact: Pick<
    PayAnyoneContact,
    "initials" | "avatarColor" | "avatarImageUrl" | "name"
  >;
  size?: number;
  className?: string;
}) {
  if (contact.avatarImageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={contact.avatarImageUrl}
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
      className={`flex items-center justify-center rounded-full text-[15px] font-bold text-[#1e1b4b] ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: contact.avatarColor,
      }}
    >
      {contact.initials}
    </div>
  );
}

function VerifiedBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#2563eb] text-[11px] font-bold text-white ${className}`}
      aria-label="Verified"
    >
      ✓
    </span>
  );
}

function AmountKeypad({
  onKey,
}: {
  onKey: (k: string) => void;
}) {
  const keys = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
  ];
  return (
    <div className="grid gap-2 bg-[#eceef2] p-3 pb-4">
      {keys.map((row) => (
        <div key={row.join("")} className="grid grid-cols-3 gap-2">
          {row.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onKey(d)}
              className="h-12 rounded-xl bg-white text-lg font-semibold text-[#111] shadow-sm active:scale-[0.98]"
            >
              {d}
            </button>
          ))}
        </div>
      ))}
      <div className="grid grid-cols-4 gap-2">
        <button
          type="button"
          onClick={() => onKey("+")}
          className="h-12 rounded-xl bg-white text-lg font-semibold text-[#999] shadow-sm"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => onKey(".")}
          className="h-12 rounded-xl bg-white text-lg font-semibold text-[#111] shadow-sm"
        >
          .
        </button>
        <button
          type="button"
          onClick={() => onKey("0")}
          className="h-12 rounded-xl bg-white text-lg font-semibold text-[#111] shadow-sm"
        >
          0
        </button>
        <button
          type="button"
          onClick={() => onKey("back")}
          className="flex h-12 items-center justify-center rounded-xl bg-white shadow-sm"
          aria-label="Backspace"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              d="M7 7h12v10H7l-5-5 5-5zM11 10l4 4m0-4l-4 4"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

function PinKeypad({
  onDigit,
  onBack,
  onPay,
  payDisabled,
}: {
  onDigit: (d: string) => void;
  onBack: () => void;
  onPay: () => void;
  payDisabled: boolean;
}) {
  const nums = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
  ];
  return (
    <div className="mt-auto grid gap-2 bg-white/95 px-3 pb-6 pt-2">
      {nums.map((row) => (
        <div key={row.join("")} className="grid grid-cols-3 gap-2">
          {row.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onDigit(d)}
              className="h-14 rounded-lg bg-[#f3f4f6] text-xl font-medium text-[#111] active:bg-[#e5e7eb]"
            >
              {d}
            </button>
          ))}
        </div>
      ))}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={onBack}
          className="flex h-14 items-center justify-center rounded-lg bg-[#f3f4f6] active:bg-[#e5e7eb]"
          aria-label="Backspace"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              stroke="currentColor"
              strokeWidth="1.6"
              d="M7 7h12v10H7l-5-5 5-5zM11 10l4 4m0-4l-4 4"
            />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => onDigit("0")}
          className="h-14 rounded-lg bg-[#f3f4f6] text-xl font-medium active:bg-[#e5e7eb]"
        >
          0
        </button>
        <button
          type="button"
          disabled={payDisabled}
          onClick={onPay}
          className="h-14 rounded-lg bg-[#64748b] text-[15px] font-bold text-white disabled:opacity-50"
        >
          Pay
        </button>
      </div>
    </div>
  );
}

function SuccessDecor() {
  return (
    <div className="relative mx-auto my-8 flex h-48 w-48 items-center justify-center">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="absolute rounded-full border-4 border-white/25"
          style={{
            width: `${12 + i * 28}%`,
            height: `${12 + i * 28}%`,
            opacity: 0.35 + i * 0.15,
          }}
        />
      ))}
      <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-white">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
          <path
            d="M6 12l4 4 8-8"
            stroke="#22c55e"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

export default function PayAnyoneFlow({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>("list");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [contacts, setContacts] = useState<PayAnyoneContact[]>([]);
  const [recent, setRecent] = useState<RecentRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(false);

  const [selected, setSelected] = useState<PayAnyoneContact | null>(null);
  const [query, setQuery] = useState("");
  const [amountRaw, setAmountRaw] = useState("0");
  const [message, setMessage] = useState("");
  const [messageOpen, setMessageOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [payLoading, setPayLoading] = useState(false);

  const [successMeta, setSuccessMeta] = useState<{
    amount: number;
    name: string;
    seconds: string;
  } | null>(null);

  const refreshContacts = useCallback(async () => {
    setLoadingList(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/contacts", { credentials: "include" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Failed to load contacts");
      }
      const data = (await res.json()) as {
        contacts: PayAnyoneContact[];
        recent: RecentRow[];
      };
      setContacts(data.contacts);
      setRecent(data.recent);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      void refreshContacts();
    }
  }, [open, refreshContacts]);

  useEffect(() => {
    if (!open) {
      setStep("list");
      setConfirmOpen(false);
      setSelected(null);
      setQuery("");
      setAmountRaw("0");
      setMessage("");
      setMessageOpen(false);
      setPin("");
      setPinError(null);
      setSuccessMeta(null);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.identifier.toLowerCase().includes(q),
    );
  }, [contacts, query]);

  const amountNum = useMemo(() => {
    const n = parseFloat(amountRaw);
    return Number.isFinite(n) ? n : 0;
  }, [amountRaw]);

  const pushAmountKey = (k: string) => {
    if (k === "+") return;
    if (k === "back") {
      setAmountRaw((prev) => {
        if (prev.length <= 1) return "0";
        const next = prev.slice(0, -1);
        return next === "" || next === "." ? "0" : next;
      });
      return;
    }
    if (k === ".") {
      setAmountRaw((prev) => {
        if (prev.includes(".")) return prev;
        return prev === "0" ? "0." : `${prev}.`;
      });
      return;
    }
    setAmountRaw((prev) => {
      let next: string;
      if (prev === "0" && k !== ".") next = k;
      else next = prev + k;
      const [w, f = ""] = next.split(".");
      if (f.length > 2) return prev;
      if (w.length > 8 && !next.includes(".")) return prev;
      return next;
    });
  };

  const toggleFavorite = async (contactId: string) => {
    try {
      const res = await fetch(`/api/contacts/${contactId}/favorite`, {
        method: "PATCH",
        credentials: "include",
      });
      if (!res.ok) return;
      const { favorite } = (await res.json()) as { favorite: boolean };
      setContacts((cs) =>
        cs.map((c) => (c.id === contactId ? { ...c, favorite } : c)),
      );
      setRecent((rs) =>
        rs.map((r) =>
          r.contactId === contactId ? { ...r, favorite } : r,
        ),
      );
      if (selected?.id === contactId) {
        setSelected({ ...selected, favorite });
      }
    } catch {
      /* ignore */
    }
  };

  const submitPayment = async () => {
    if (!selected || amountNum <= 0) return;
    setPayLoading(true);
    setPinError(null);
    const t0 = performance.now();
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          contactId: selected.id,
          amount: amountNum,
          message,
          upiPin: pin,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPinError(
          typeof data.error === "string" ? data.error : "Payment failed",
        );
        setPin("");
        return;
      }
      const t1 = performance.now();
      const sec = ((t1 - t0) / 1000).toFixed(2);
      setSuccessMeta({
        amount: typeof data.amount === "number" ? data.amount : amountNum,
        name: selected.name,
        seconds: sec,
      });
      setStep("success");
      void refreshContacts();
    } catch {
      setPinError("Network error");
      setPin("");
    } finally {
      setPayLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pay-anyone-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close overlay"
        onClick={onClose}
      />
      <div
        className={`relative flex max-h-[100dvh] w-full flex-col overflow-hidden shadow-2xl sm:max-h-[min(720px,92vh)] sm:max-w-[400px] sm:rounded-[28px] ${
          step === "pin"
            ? "min-h-[100dvh] bg-[#fff7ed] sm:min-h-0 sm:rounded-[28px]"
            : step === "success"
              ? "min-h-[100dvh] bg-[#22c55e] sm:min-h-0"
              : "rounded-t-3xl bg-[#f0f2f5] sm:rounded-[28px]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {step === "list" ? (
          <>
            <header className="shrink-0 bg-[#f0f2f5] px-4 pb-2 pt-3 sm:pt-4">
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
                  id="pay-anyone-title"
                  className="text-lg font-bold text-[#111]"
                >
                  Send Money
                </h2>
              </div>
              <UpiAppLogos />
              <div className="relative mt-4">
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
                  placeholder="Enter Name, Number or UPI ID"
                  className="w-full rounded-2xl border-0 bg-white py-3 pl-10 pr-3 text-[14px] shadow-sm outline-none ring-1 ring-[#e5e7eb] placeholder:text-[#9ca3af] focus:ring-2 focus:ring-[#00baf2]"
                />
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6 pt-2">
              {loadError ? (
                <p className="py-8 text-center text-sm text-red-600">
                  {loadError}
                </p>
              ) : loadingList ? (
                <p className="py-8 text-center text-sm text-[#666]">
                  Loading…
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-4 gap-x-2 gap-y-4">
                    {filtered.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelected(c);
                          setAmountRaw("0");
                          setMessage("");
                          setMessageOpen(false);
                          setStep("amount");
                        }}
                        className="flex flex-col items-center gap-1.5 text-center"
                      >
                        <div className="relative">
                          <AvatarBubble contact={c} size={52} />
                          {c.starredSuggestion ? (
                            <span className="absolute -right-0.5 -top-0.5 text-[11px]">
                              ⭐
                            </span>
                          ) : null}
                        </div>
                        <span className="line-clamp-2 w-full text-[10px] font-medium leading-tight text-[#333]">
                          {c.name}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="hide-scrollbar mt-5 flex gap-2 overflow-x-auto pb-1">
                    {[
                      { icon: "📅", label: "Monthly Reminders" },
                      { icon: "↻", label: "Self Transfer" },
                      { icon: "▣", label: "Receive" },
                    ].map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        className="shrink-0 rounded-full border border-[#e5e7eb] bg-white px-4 py-2 text-[12px] font-semibold text-[#333] shadow-sm"
                      >
                        <span className="mr-1.5">{p.icon}</span>
                        {p.label}
                      </button>
                    ))}
                  </div>

                  <h3 className="mt-6 text-[13px] font-bold text-[#111]">
                    Recent Payments
                  </h3>
                  <ul className="mt-2 space-y-0 divide-y divide-[#e8eaed] rounded-2xl bg-white shadow-sm ring-1 ring-[#eef0f3]">
                    {recent.map((r) => (
                      <li
                        key={r.transactionId}
                        className="flex items-stretch divide-x divide-[#e8eaed]"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            const c = contacts.find((x) => x.id === r.contactId);
                            if (c) {
                              setSelected(c);
                              setAmountRaw("0");
                              setMessage("");
                              setMessageOpen(false);
                              setStep("amount");
                            }
                          }}
                          className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 text-left transition hover:bg-[#fafafa]"
                        >
                          <AvatarBubble contact={r} size={44} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <span className="truncate font-semibold text-[#111]">
                                {r.name}
                              </span>
                              {r.verified ? <VerifiedBadge /> : null}
                            </div>
                            <p className="truncate text-[12px] text-[#666]">
                              {r.identifier}
                            </p>
                            <p className="mt-0.5 text-[12px] text-[#15803d]">
                              <span className="mr-0.5">₹</span>
                              {formatInrAmount(r.amount)} Sent on{" "}
                              {formatSentDay(r.sentAt)}
                            </p>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => void toggleFavorite(r.contactId)}
                          className="flex shrink-0 items-center justify-center px-3 py-3 text-[#f59e0b] transition hover:bg-[#fafafa]"
                          aria-label={
                            r.favorite ? "Remove favorite" : "Favorite"
                          }
                        >
                          {r.favorite ? "★" : "☆"}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </>
        ) : null}

        {step === "amount" && selected ? (
          <div className="relative flex min-h-0 flex-1 flex-col bg-[#f7f8fa]">
            <header className="flex shrink-0 items-center gap-2 px-2 py-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmOpen(false);
                  setStep("list");
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-black/5"
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
            </header>
            <div className="flex flex-1 flex-col px-4 pb-0">
              <div className="flex flex-col items-center pt-2">
                <AvatarBubble contact={selected} size={72} />
                <div className="mt-3 flex items-center gap-1">
                  <span className="text-lg font-bold text-[#111]">
                    {selected.name}
                  </span>
                  {selected.verified ? <VerifiedBadge /> : null}
                </div>
                <p className="mt-1 flex items-center gap-1 text-[13px] text-[#666]">
                  {selected.identifier}
                  <span className="text-[10px] font-bold text-[#00baf2]">
                    UPI
                  </span>
                </p>
              </div>

              <div className="mt-8 flex flex-1 flex-col items-center justify-start">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-2xl font-light text-[#9ca3af]">₹</span>
                  <span
                    className={`text-5xl font-semibold tabular-nums tracking-tight ${
                      amountNum > 0 ? "text-[#111]" : "text-[#d1d5db]"
                    }`}
                  >
                    {amountRaw}
                  </span>
                </div>
                {amountNum > 0 ? (
                  <p className="mt-2 px-4 text-center text-[12px] text-[#9ca3af]">
                    {rupeesLine(amountNum)}
                  </p>
                ) : null}
                <div className="mt-6 w-full max-w-sm px-2">
                  {messageOpen ? (
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Add a note"
                      className="w-full rounded-full border border-dashed border-[#cbd5e1] px-4 py-2.5 text-[13px] outline-none focus:border-[#00baf2]"
                      autoFocus
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setMessageOpen(true)}
                      className="w-full rounded-full border border-dashed border-[#cbd5e1] px-5 py-2 text-[13px] text-[#64748b]"
                    >
                      + Add Message
                    </button>
                  )}
                </div>
              </div>

              <button
                type="button"
                disabled={amountNum <= 0}
                onClick={() => setConfirmOpen(true)}
                className="mx-auto mb-3 mt-4 w-full max-w-sm rounded-xl bg-[#00baf2] py-3.5 text-[16px] font-bold text-white shadow-md disabled:opacity-40"
              >
                Proceed Securely
              </button>
            </div>
            <AmountKeypad onKey={pushAmountKey} />

            {confirmOpen ? (
              <div className="absolute inset-0 z-10 flex flex-col justify-end bg-black/50">
                <div className="max-h-[55%] overflow-y-auto rounded-t-3xl bg-white px-4 pb-6 pt-4 shadow-[0_-8px_30px_rgba(0,0,0,0.15)]">
                  <p className="text-center text-[17px] font-bold text-[#111]">
                    Pay ₹{formatInrAmount(amountNum)} from
                  </p>
                  <div className="mt-4 rounded-2xl border-2 border-[#bfdbfe] bg-white p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1e40af] text-[11px] font-bold text-white">
                        SBI
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-[#111]">
                          SBI Bank - 6152
                        </p>
                        <button
                          type="button"
                          className="text-[13px] font-semibold text-[#2563eb]"
                        >
                          Check Balance
                        </button>
                      </div>
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2563eb] text-white">
                        ✓
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#bfdbfe] py-3 text-[14px] font-semibold text-[#2563eb]"
                  >
                    <span className="text-lg">+</span> Link Bank Account
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmOpen(false);
                      setPin("");
                      setPinError(null);
                      setStep("pin");
                    }}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#00baf2] py-3.5 text-[16px] font-bold text-white"
                  >
                    <span aria-hidden>🛡</span>
                    Pay Securely ₹{formatInrAmount(amountNum)}
                  </button>
                  <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-[#9ca3af]">
                    <span>Paytm</span>
                    <span>|</span>
                    <span>Powered by UPI</span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {step === "pin" && selected ? (
          <div className="flex min-h-[100dvh] flex-col px-4 pb-safe sm:min-h-[560px]">
            <header className="flex shrink-0 items-start justify-between pt-3">
              <div>
                <p className="text-[15px] font-bold text-[#c2410c]">UPI</p>
                <p className="text-[13px] font-semibold text-[#444]">
                  SBI Bank - 6152
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStep("amount");
                  setPin("");
                  setPinError(null);
                  setConfirmOpen(true);
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full text-2xl text-[#444] hover:bg-black/5"
                aria-label="Close"
              >
                ×
              </button>
            </header>
            <div className="mt-6 flex items-start justify-between gap-3">
              <div>
                <p className="text-2xl font-bold text-[#111]">
                  Pay ₹{formatInrAmount(amountNum)}
                </p>
                <p className="mt-1 text-[14px] text-[#555]">
                  To {selected.name}
                </p>
              </div>
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#fed7aa] text-xl">
                ₹→👤
              </div>
            </div>
            <p className="mt-10 text-center text-[15px] font-medium text-[#444]">
              Enter your PIN
            </p>
            <div className="mt-4 flex justify-center gap-2">
              {Array.from({ length: 6 }, (_, i) => (
                <span
                  key={i}
                  className={`h-3.5 w-3.5 rounded-full border-2 border-[#fb923c] ${
                    pin.length > i ? "bg-[#fb923c]" : "bg-transparent"
                  }`}
                />
              ))}
            </div>
            {pinError ? (
              <p className="mt-3 text-center text-sm text-red-600">{pinError}</p>
            ) : null}
            <p className="mt-8 flex items-center justify-center gap-1 text-center text-[11px] text-[#78716c]">
              <span>ⓘ</span> Never enter your UPI PIN to receive money
            </p>
            <PinKeypad
              onDigit={(d) =>
                setPin((p) => (p.length >= 6 ? p : p + d))
              }
              onBack={() => setPin((p) => p.slice(0, -1))}
              onPay={() => void submitPayment()}
              payDisabled={pin.length !== 6 || payLoading}
            />
          </div>
        ) : null}

        {step === "success" && successMeta ? (
          <div className="flex min-h-[100dvh] flex-col items-center px-6 pb-8 pt-10 text-white sm:min-h-[560px]">
            <p className="text-xl font-bold lowercase tracking-wide">paytm</p>
            <p className="mt-10 text-[15px] font-medium opacity-95">
              Paid to {successMeta.name}
            </p>
            <p className="mt-2 text-4xl font-bold tabular-nums">
              ₹{formatInrAmount(successMeta.amount)}
            </p>
            <p className="mt-2 text-[13px] opacity-90">
              Payment completed in {successMeta.seconds} Sec ⚡
            </p>
            <SuccessDecor />
            <div className="mt-auto flex flex-wrap items-center justify-center gap-2 text-[10px] opacity-90">
              <span className="font-bold">Paytm</span>
              <span>|</span>
              <span>Powered by UPI</span>
              <span>|</span>
              <span className="font-semibold">YES BANK</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 rounded-full bg-white/20 px-8 py-2.5 text-[14px] font-semibold backdrop-blur-sm"
            >
              Done
            </button>
          </div>
        ) : null}

      </div>
    </div>
  );
}
