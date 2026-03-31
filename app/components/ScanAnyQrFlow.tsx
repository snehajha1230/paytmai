"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AmountKeypad,
  AvatarBubble,
  formatInrAmount,
  PinKeypad,
  SuccessDecor,
  VerifiedBadge,
} from "@/app/components/pay-flow-shared";
import type { PayAnyoneContact } from "@/lib/payee-types";
import { generateQrPayee } from "@/lib/qr-payee";
import { rupeesLine } from "@/lib/rupees-to-words";

type Phase = "scan" | "amount" | "pin" | "success";

export default function ScanAnyQrFlow({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("scan");
  const [payee, setPayee] = useState<PayAnyoneContact | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [amountRaw, setAmountRaw] = useState("0");
  const [message, setMessage] = useState("");
  const [messageOpen, setMessageOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [payLoading, setPayLoading] = useState(false);
  const [confirmBalance, setConfirmBalance] = useState<number | null>(null);
  const [confirmBalanceLoading, setConfirmBalanceLoading] = useState(false);
  const [confirmBalanceError, setConfirmBalanceError] = useState<string | null>(
    null,
  );

  const [successMeta, setSuccessMeta] = useState<{
    amount: number;
    name: string;
    seconds: string;
  } | null>(null);

  const resetAll = useCallback(() => {
    setPhase("scan");
    setPayee(null);
    setConfirmOpen(false);
    setAmountRaw("0");
    setMessage("");
    setMessageOpen(false);
    setPin("");
    setPinError(null);
    setSuccessMeta(null);
    setConfirmBalance(null);
    setConfirmBalanceLoading(false);
    setConfirmBalanceError(null);
  }, []);

  useEffect(() => {
    if (!open) resetAll();
  }, [open, resetAll]);

  const amountNum = useMemo(() => {
    const n = parseFloat(amountRaw);
    return Number.isFinite(n) ? n : 0;
  }, [amountRaw]);

  const simulateScan = useCallback(() => {
    setPayee(generateQrPayee());
    setAmountRaw("0");
    setMessage("");
    setMessageOpen(false);
    setPhase("amount");
  }, []);

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

  const submitPayment = async () => {
    if (!payee || amountNum <= 0) return;
    setPayLoading(true);
    setPinError(null);
    const t0 = performance.now();
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          kind: "qr",
          merchantName: payee.name,
          identifier: payee.identifier,
          initials: payee.initials,
          avatarColor: payee.avatarColor,
          tag: payee.categoryTag,
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
        name: payee.name,
        seconds: sec,
      });
      setPhase("success");
    } catch {
      setPinError("Network error");
      setPin("");
    } finally {
      setPayLoading(false);
    }
  };

  if (!open) return null;

  const shellClass =
    phase === "pin"
      ? "min-h-[100dvh] bg-[#fff7ed] sm:min-h-0 sm:rounded-[28px]"
      : phase === "success"
        ? "min-h-[100dvh] rounded-t-3xl bg-[#22c55e] sm:min-h-0 sm:rounded-[28px]"
        : phase === "scan"
          ? "min-h-[100dvh] rounded-none bg-[#0a0a0a] sm:min-h-[min(720px,92vh)] sm:rounded-[28px]"
          : "rounded-t-3xl bg-[#f0f2f5] sm:rounded-[28px]";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scan-qr-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close overlay"
        onClick={onClose}
      />
      <div
        className={`relative flex max-h-[100dvh] w-full flex-col overflow-hidden shadow-2xl sm:max-h-[min(720px,92vh)] sm:max-w-[400px] ${shellClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        {phase === "scan" ? (
          <>
            <header className="flex shrink-0 items-center justify-between px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10"
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
              <h2 id="scan-qr-title" className="text-[16px] font-semibold">
                Scan any QR code
              </h2>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10"
                aria-label="More"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="5" r="1.8" />
                  <circle cx="12" cy="12" r="1.8" />
                  <circle cx="12" cy="19" r="1.8" />
                </svg>
              </button>
            </header>

            <button
              type="button"
              onClick={simulateScan}
              className="relative mx-3 mt-1 flex min-h-[38vh] flex-1 flex-col rounded-lg bg-black ring-1 ring-white/10 sm:min-h-[280px]"
              aria-label="Camera view — tap to simulate scanning a QR code"
            >
              <div
                className="pointer-events-none absolute inset-y-2 right-2 w-1 rounded-full bg-gradient-to-b from-[#38bdf8] via-[#0ea5e9] to-[#0284c7] opacity-90 shadow-[0_0_12px_rgba(14,165,233,0.6)]"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(180deg, transparent, transparent 3px, rgba(255,255,255,0.15) 3px, rgba(255,255,255,0.15) 5px)",
                }}
              />
              <span className="pointer-events-none absolute bottom-4 left-0 right-0 text-center text-[12px] text-white/55">
                Tap here to simulate scan
              </span>
            </button>

            <div className="mt-3 flex shrink-0 items-center justify-center gap-2 px-3 pb-2">
              <button
                type="button"
                className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2a2a2a] text-white shadow-md"
                aria-label="Flashlight"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M10 2h4v3h-4V2zm0 5h4l-1 13H11L10 7zm2-5v3"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              <div className="mx-1 flex max-w-[200px] flex-1 items-center gap-2 rounded-2xl bg-[#bae6fd]/95 px-3 py-2.5 shadow-sm">
                <span className="text-lg" aria-hidden>
                  🛡
                </span>
                <p className="text-left text-[11px] font-semibold leading-snug text-[#0c4a6e]">
                  Secure your payments with fingerprint ›
                </p>
              </div>
              <button
                type="button"
                className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2a2a2a] text-white shadow-md"
                aria-label="Gallery"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <rect
                    x="3"
                    y="5"
                    width="18"
                    height="14"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.4"
                  />
                  <circle cx="8.5" cy="10" r="1.5" fill="currentColor" />
                  <path
                    d="M21 15l-5-5-4 4"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <div className="shrink-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1">
              <div className="flex items-center gap-2 rounded-full bg-white py-2.5 pl-3 pr-2 shadow-lg">
                <span className="text-[#9ca3af]">
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
                  readOnly
                  placeholder="Enter Mob. Number or Name"
                  className="min-w-0 flex-1 bg-transparent text-[13px] text-[#111] outline-none placeholder:text-[#9ca3af]"
                  aria-hidden
                />
                <div className="flex shrink-0 items-center gap-1 border-l border-[#e5e7eb] pl-2">
                  <span className="text-[10px] font-bold text-[#64748b]">
                    Recents
                  </span>
                  <div className="flex -space-x-2">
                    {["#c4b5fd", "#86efac", "#fde047"].map((bg, i) => (
                      <div
                        key={bg}
                        className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-[9px] font-bold text-[#1e1b4b]"
                        style={{
                          backgroundColor: bg,
                          zIndex: 3 - i,
                        }}
                      >
                        {["YA", "AK", "RD"][i]}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : null}

        {phase === "amount" && payee ? (
          <div className="relative flex min-h-0 flex-1 flex-col bg-[#f7f8fa]">
            <header className="flex shrink-0 items-center gap-2 px-2 py-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmOpen(false);
                  setPhase("scan");
                  setPayee(null);
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
                <AvatarBubble contact={payee} size={72} />
                <div className="mt-3 flex items-center gap-1">
                  <span className="text-lg font-bold text-[#111]">
                    {payee.name}
                  </span>
                  {payee.verified ? <VerifiedBadge /> : null}
                </div>
                <p className="mt-1 flex items-center gap-1 text-[13px] text-[#666]">
                  {payee.identifier}
                  <span className="text-[10px] font-bold text-[#00baf2]">
                    UPI
                  </span>
                </p>
                {payee.categoryTag ? (
                  <span className="mt-2 rounded-full bg-[#e0f2fe] px-2.5 py-0.5 text-[10px] font-semibold capitalize text-[#0369a1]">
                    {payee.categoryTag}
                  </span>
                ) : null}
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
                        {confirmBalanceError ? (
                          <p className="text-[11px] text-red-600">
                            {confirmBalanceError}
                          </p>
                        ) : null}
                        {confirmBalance !== null ? (
                          <p className="text-[13px] font-semibold text-[#0f172a]">
                            ₹{formatInrAmount(confirmBalance)}
                          </p>
                        ) : null}
                        <button
                          type="button"
                          disabled={confirmBalanceLoading}
                          onClick={async () => {
                            setConfirmBalanceLoading(true);
                            setConfirmBalanceError(null);
                            try {
                              const res = await fetch("/api/account/balance", {
                                credentials: "include",
                              });
                              const data = await res.json().catch(() => ({}));
                              if (!res.ok) {
                                setConfirmBalanceError(
                                  typeof data.error === "string"
                                    ? data.error
                                    : "Failed",
                                );
                                return;
                              }
                              if (typeof data.accountBalance === "number") {
                                setConfirmBalance(data.accountBalance);
                              }
                            } catch {
                              setConfirmBalanceError("Network error");
                            } finally {
                              setConfirmBalanceLoading(false);
                            }
                          }}
                          className="text-[13px] font-semibold text-[#2563eb] disabled:opacity-50"
                        >
                          {confirmBalanceLoading
                            ? "Checking…"
                            : "Check Balance"}
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
                      setPhase("pin");
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

        {phase === "pin" && payee ? (
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
                  setPhase("amount");
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
                <p className="mt-1 text-[14px] text-[#555]">To {payee.name}</p>
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

        {phase === "success" && successMeta ? (
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
