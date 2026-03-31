"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AvatarBubble,
  formatInrAmount,
  PinKeypad,
  SuccessDecor,
} from "@/app/components/pay-flow-shared";
import type { PayAnyoneContact } from "@/lib/payee-types";
import {
  RECHARGE_PLANS,
  RECHARGE_TABS,
  type RechargePlan,
  quickRechargePlans,
  rechargeMessage,
  searchPlans,
} from "@/lib/mobile-recharge-plans";
import {
  digitsOnly,
  formatInPhoneDisplay,
  phonesMatch,
} from "@/lib/phone-match";

type RecentRow = PayAnyoneContact & {
  transactionId: string;
  contactId: string;
  amount: number;
  sentAt: string;
  isQr?: boolean;
};

type Step = "home" | "plans" | "confirm" | "pin" | "success";

const OPERATOR_STYLES = [
  { label: "Jio", bg: "#1e88e5" },
  { label: "Vi", bg: "#e53935" },
  { label: "A", bg: "#ef4444" },
  { label: "Vi", bg: "#e53935" },
  { label: "BSNL", bg: "#ff9800" },
] as const;

function operatorVisual(contactId: string) {
  let h = 0;
  for (let i = 0; i < contactId.length; i++) {
    h = (h + contactId.charCodeAt(i)) % OPERATOR_STYLES.length;
  }
  return OPERATOR_STYLES[h];
}

function formatRechargeDay(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return "";
  }
}

function planMatchingAmount(amount: number): RechargePlan | null {
  return RECHARGE_PLANS.find((p) => p.price === amount) ?? null;
}

function formatContactIdentifier(c: PayAnyoneContact): string {
  if (c.identifierType === "phone") return formatInPhoneDisplay(c.identifier);
  return c.identifier;
}

function OperatorCircle({
  contactId,
  size = 44,
}: {
  contactId: string;
  size?: number;
}) {
  const op = operatorVisual(contactId);
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm"
      style={{ width: size, height: size, backgroundColor: op.bg }}
      aria-hidden
    >
      {op.label.length <= 2 ? op.label : op.label.slice(0, 2)}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#e8f4fc] px-4 py-2">
      <h3 className="text-[13px] font-bold text-[#111]">{children}</h3>
    </div>
  );
}

export default function MobileRechargeFlow({
  open,
  onClose,
  userPhone,
  userDisplayName,
}: {
  open: boolean;
  onClose: () => void;
  userPhone: string | null;
  userDisplayName: string;
}) {
  const [step, setStep] = useState<Step>("home");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [contacts, setContacts] = useState<PayAnyoneContact[]>([]);
  const [recent, setRecent] = useState<RecentRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(false);

  const [manualDigits, setManualDigits] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);

  const [selected, setSelected] = useState<PayAnyoneContact | null>(null);
  const [planTab, setPlanTab] = useState<string>(RECHARGE_TABS[0]);
  const [planSearch, setPlanSearch] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<RechargePlan | null>(null);

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

  /** Random portrait for “My Number” (new pick each time the modal opens). */
  const myNumberProfileUrl = useMemo(() => {
    if (!open) return null;
    const n = Math.floor(Math.random() * 70) + 1;
    return `https://i.pravatar.cc/128?img=${n}`;
  }, [open]);

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
    if (open) void refreshContacts();
  }, [open, refreshContacts]);

  useEffect(() => {
    if (!open) {
      setStep("home");
      setConfirmOpen(false);
      setManualDigits("");
      setManualError(null);
      setSelected(null);
      setPlanTab(RECHARGE_TABS[0]);
      setPlanSearch("");
      setSelectedPlan(null);
      setPin("");
      setPinError(null);
      setSuccessMeta(null);
      setConfirmBalance(null);
      setConfirmBalanceLoading(false);
      setConfirmBalanceError(null);
    }
  }, [open]);

  const phoneContacts = useMemo(
    () => contacts.filter((c) => c.identifierType === "phone"),
    [contacts],
  );

  const myNumberContact = useMemo(() => {
    if (!userPhone) return null;
    return (
      phoneContacts.find((c) => phonesMatch(c.identifier, userPhone)) ?? null
    );
  }, [phoneContacts, userPhone]);

  const yogeshSinghContact = useMemo(
    () => contacts.find((c) => c.name === "Yogesh Singh Adhikari") ?? null,
    [contacts],
  );

  const billsList = useMemo(() => {
    if (myNumberContact) {
      return phoneContacts.filter((c) => c.id !== myNumberContact.id);
    }
    return phoneContacts;
  }, [phoneContacts, myNumberContact]);

  const lastRechargeByContact = useMemo(() => {
    const map = new Map<string, RecentRow>();
    for (const r of recent) {
      if (r.isQr || !r.contactId) continue;
      if (!map.has(r.contactId)) map.set(r.contactId, r);
    }
    return map;
  }, [recent]);

  const previousForSelected = useMemo(() => {
    if (!selected) return [];
    return recent.filter((r) => !r.isQr && r.contactId === selected.id);
  }, [recent, selected]);

  const filteredPlans = useMemo(
    () => searchPlans(planSearch, planTab),
    [planSearch, planTab],
  );

  const quickPlans = useMemo(() => quickRechargePlans(), []);

  const openPlansFor = (c: PayAnyoneContact) => {
    setSelected(c);
    setPlanTab(RECHARGE_TABS[0]);
    setPlanSearch("");
    setSelectedPlan(null);
    setStep("plans");
  };

  const openConfirmWithPlan = (c: PayAnyoneContact, p: RechargePlan) => {
    setSelected(c);
    setPlanTab(RECHARGE_TABS[0]);
    setPlanSearch("");
    setSelectedPlan(p);
    setStep("confirm");
  };

  const tryManualContinue = () => {
    setManualError(null);
    const ten = digitsOnly(manualDigits).slice(-10);
    if (ten.length !== 10) {
      setManualError("Enter a valid 10-digit mobile number");
      return;
    }
    const match = phoneContacts.find(
      (c) => digitsOnly(c.identifier).slice(-10) === ten,
    );
    if (!match) {
      setManualError("No saved contact matches this number");
      return;
    }
    openPlansFor(match);
  };

  const submitPayment = async () => {
    if (!selected || !selectedPlan) return;
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
          amount: selectedPlan.price,
          message: rechargeMessage(selectedPlan),
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
      setSuccessMeta({
        amount:
          typeof data.amount === "number" ? data.amount : selectedPlan.price,
        name: selected.name,
        seconds: ((t1 - t0) / 1000).toFixed(2),
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

  const pinOrSuccess = step === "pin" || step === "success";
  const shellClass = pinOrSuccess
    ? `relative flex max-h-[100dvh] w-full flex-col overflow-hidden shadow-2xl sm:max-h-[min(720px,92vh)] sm:max-w-[400px] sm:rounded-[28px] ${
        step === "pin"
          ? "min-h-[100dvh] rounded-t-3xl bg-[#fff7ed] sm:min-h-0 sm:rounded-[28px]"
          : "min-h-[100dvh] rounded-t-3xl bg-[#22c55e] sm:min-h-0 sm:rounded-[28px]"
      }`
    : "relative flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-[#f5f6f8] shadow-2xl sm:h-[min(720px,92vh)] sm:max-h-[min(720px,92vh)] sm:max-w-[400px] sm:rounded-[28px]";

  return (
    <div
      className="fixed inset-0 z-[170] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-recharge-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close overlay"
        onClick={onClose}
      />
      <div
        className={shellClass}
        onClick={(e) => e.stopPropagation()}
      >
        {step === "home" ? (
          <>
            <header className="shrink-0 bg-white px-3 pb-2 pt-3 sm:pt-4">
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
                  id="mobile-recharge-title"
                  className="text-[17px] font-bold text-[#111]"
                >
                  Recharge or Pay Mobile Bill
                </h2>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="mx-3 flex items-center justify-between gap-2 rounded-lg bg-[#e8f8ef] px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-lg" aria-hidden>
                    🎁
                  </span>
                  <p className="text-[12px] font-semibold text-[#166534]">
                    Chance to win ₹200 cashback
                  </p>
                </div>
                <button
                  type="button"
                  className="shrink-0 text-[12px] font-bold text-[#00baf2]"
                >
                  View All &gt;
                </button>
              </div>

              <div className="mt-4 px-4">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="text-[13px] font-bold text-[#111]">
                    Enter Mobile Number
                  </span>
                  <div
                    className="flex gap-0.5 opacity-80"
                    aria-hidden
                  >
                    {["J", "A", "V", "B", "I"].map((ch, i) => (
                      <span
                        key={i}
                        className="flex h-5 w-5 items-center justify-center rounded-full bg-[#e5e7eb] text-[8px] font-bold text-[#555]"
                      >
                        {ch}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 rounded-xl bg-white py-2 pl-3 pr-2 shadow-sm ring-1 ring-[#e8eaed]">
                  <span className="shrink-0 pt-2 text-[15px] font-medium text-[#111]">
                    +91 -
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    placeholder="00000 00000"
                    value={manualDigits}
                    onChange={(e) => {
                      setManualDigits(
                        e.target.value.replace(/\D/g, "").slice(0, 10),
                      );
                      setManualError(null);
                    }}
                    className="min-w-0 flex-1 py-2 text-[16px] font-medium outline-none placeholder:text-[#bbb]"
                  />
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[#00baf2]"
                    aria-hidden
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M8 5h12v14H8V5zM6 3H4v18h2M8 9h8M8 13h5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                    </svg>
                  </span>
                </div>
                {manualError ? (
                  <p className="mt-1.5 text-[12px] text-red-600">{manualError}</p>
                ) : null}
                <button
                  type="button"
                  onClick={() => tryManualContinue()}
                  className="mt-3 w-full rounded-xl bg-[#00baf2] py-3 text-[14px] font-bold text-white shadow-sm"
                >
                  Continue
                </button>
              </div>

              {myNumberContact || yogeshSinghContact ? (
                <>
                  <SectionHeading>My Number</SectionHeading>
                  <div className="border-b border-[#eef0f3] bg-white px-3 py-3">
                    {myNumberContact ? (
                      <>
                        <div className="flex items-start gap-3">
                          {myNumberProfileUrl ? (
                            <AvatarBubble
                              contact={{
                                name: userDisplayName,
                                initials: myNumberContact.initials,
                                avatarColor: myNumberContact.avatarColor,
                                avatarImageUrl: myNumberProfileUrl,
                              }}
                              size={52}
                            />
                          ) : (
                            <OperatorCircle
                              contactId={myNumberContact.id}
                              size={52}
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-[#111]">
                              {userDisplayName}
                            </p>
                            <p className="text-[13px] text-[#666]">
                              {formatInPhoneDisplay(myNumberContact.identifier)}
                            </p>
                            {lastRechargeByContact.get(myNumberContact.id) ? (
                              <p className="mt-1 text-[12px] text-[#64748b]">
                                Recharged ₹
                                {formatInrAmount(
                                  lastRechargeByContact.get(
                                    myNumberContact.id,
                                  )!.amount,
                                )}{" "}
                                on{" "}
                                {formatRechargeDay(
                                  lastRechargeByContact.get(
                                    myNumberContact.id,
                                  )!.sentAt,
                                )}
                              </p>
                            ) : (
                              <p className="mt-1 text-[12px] text-[#64748b]">
                                Prepaid · Delhi NCR
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => openPlansFor(myNumberContact)}
                            className="shrink-0 rounded-full bg-[#00baf2] px-4 py-2 text-[12px] font-bold text-white"
                          >
                            Recharge
                          </button>
                        </div>
                        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                          {quickPlans.map((p, idx) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() =>
                                openConfirmWithPlan(myNumberContact, p)
                              }
                              className="relative shrink-0 rounded-full border border-[#e5e7eb] bg-[#fafafa] px-3 py-2 text-left text-[11px] font-semibold text-[#333] shadow-sm"
                            >
                              {idx === 0 ? (
                                <span className="absolute -top-1.5 left-2 rounded bg-amber-400 px-1 text-[8px] font-bold text-[#78350f]">
                                  Popular
                                </span>
                              ) : null}
                              <span className="mt-1 block whitespace-nowrap">
                                {p.data} for ₹{p.price} &gt;
                              </span>
                            </button>
                          ))}
                        </div>
                      </>
                    ) : null}

                    {yogeshSinghContact ? (
                      <div
                        className={
                          myNumberContact
                            ? "border-t border-[#eef0f3] pt-3"
                            : ""
                        }
                      >
                        <div className="flex items-start gap-3">
                          <AvatarBubble
                            contact={yogeshSinghContact}
                            size={52}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-[#111]">
                              {yogeshSinghContact.name}
                            </p>
                            <p className="text-[13px] text-[#666]">
                              {formatContactIdentifier(yogeshSinghContact)}
                            </p>
                            {lastRechargeByContact.get(yogeshSinghContact.id) ? (
                              <p className="mt-1 text-[12px] text-[#64748b]">
                                Recharged ₹
                                {formatInrAmount(
                                  lastRechargeByContact.get(
                                    yogeshSinghContact.id,
                                  )!.amount,
                                )}{" "}
                                on{" "}
                                {formatRechargeDay(
                                  lastRechargeByContact.get(
                                    yogeshSinghContact.id,
                                  )!.sentAt,
                                )}
                              </p>
                            ) : (
                              <p className="mt-1 text-[12px] text-[#64748b]">
                                Prepaid · Delhi NCR
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => openPlansFor(yogeshSinghContact)}
                            className="shrink-0 rounded-full bg-[#00baf2] px-4 py-2 text-[12px] font-bold text-white"
                          >
                            Recharge
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </>
              ) : null}

              <SectionHeading>My Recharges &amp; Bills</SectionHeading>
              {loadError ? (
                <p className="px-4 py-6 text-center text-sm text-red-600">
                  {loadError}
                </p>
              ) : loadingList ? (
                <p className="px-4 py-6 text-center text-sm text-[#666]">
                  Loading…
                </p>
              ) : billsList.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-[#666]">
                  No saved mobile contacts yet.
                </p>
              ) : (
                <ul className="divide-y divide-[#eef0f3] bg-white">
                  {billsList.map((c) => {
                    const last = lastRechargeByContact.get(c.id);
                    return (
                      <li
                        key={c.id}
                        className="flex items-center gap-3 px-3 py-3"
                      >
                        <OperatorCircle contactId={c.id} size={44} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-[#111]">
                            {c.name}
                          </p>
                          <p className="text-[12px] text-[#666]">
                            {formatInPhoneDisplay(c.identifier)}
                          </p>
                          <p className="mt-0.5 text-[12px] text-[#64748b]">
                            {last
                              ? `Recharged ₹${formatInrAmount(last.amount)} on ${formatRechargeDay(last.sentAt)}`
                              : "Saved in your contacts"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => openPlansFor(c)}
                          className="shrink-0 rounded-full bg-[#00baf2] px-4 py-2 text-[12px] font-bold text-white"
                        >
                          Recharge
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </>
        ) : null}

        {step === "plans" && selected ? (
          <>
            <header className="shrink-0 bg-white px-2 pb-2 pt-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setStep("home")}
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
                <OperatorCircle contactId={selected.id} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold text-[#111]">
                    {selected.name}
                  </p>
                  <p className="text-[12px] text-[#666]">
                    {formatInPhoneDisplay(selected.identifier)}
                  </p>
                  <p className="text-[11px] text-[#64748b]">
                    Prepaid · Delhi NCR{" "}
                    <button
                      type="button"
                      className="font-bold text-[#00baf2]"
                    >
                      Change
                    </button>
                  </p>
                </div>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
              <div className="my-2 flex items-center justify-between rounded-lg border border-[#bbf7d0] bg-white px-3 py-2">
                <span className="text-[11px] font-semibold text-[#166534]">
                  5% off on Axis Bank Neo Credit Card
                </span>
                <button
                  type="button"
                  className="text-[11px] font-bold text-[#00baf2]"
                >
                  View All &gt;
                </button>
              </div>

              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-[13px] font-bold text-[#111]">
                  Previous Recharges
                </h3>
                <button
                  type="button"
                  className="text-[12px] font-bold text-[#00baf2]"
                >
                  View All
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {previousForSelected.slice(0, 4).map((r) => {
                  const plan = planMatchingAmount(r.amount);
                  const label = plan
                    ? `₹${plan.price} - ${plan.validity} - ${plan.data}`
                    : `₹${formatInrAmount(r.amount)} recharge`;
                  return (
                    <div
                      key={r.transactionId}
                      className="min-w-[200px] shrink-0 rounded-xl border border-[#e8eaed] bg-white p-3 shadow-sm"
                    >
                      <p className="text-[13px] font-bold text-[#111]">
                        {label}
                      </p>
                      <p className="mt-1 text-[11px] text-[#64748b]">
                        Recharged ₹{formatInrAmount(r.amount)} on{" "}
                        {formatRechargeDay(r.sentAt)}
                      </p>
                      <button
                        type="button"
                        className="mt-2 text-[11px] font-bold text-[#00baf2]"
                      >
                        View Details
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (plan) {
                            setSelectedPlan(plan);
                            setStep("confirm");
                          } else {
                            const fallback: RechargePlan = {
                              id: `repeat-${r.transactionId}`,
                              price: r.amount,
                              validity: "—",
                              data: "—",
                              description: "Repeat last recharge amount.",
                              category: "Popular",
                            };
                            setSelectedPlan(fallback);
                            setStep("confirm");
                          }
                        }}
                        className="mt-2 w-full rounded-lg bg-[#00baf2] py-2 text-[12px] font-bold text-white"
                      >
                        {plan ? "Repeat" : "Recharge"}
                      </button>
                    </div>
                  );
                })}
                {previousForSelected.length === 0 ? (
                  <p className="text-[12px] text-[#888]">
                    No recharges yet for this number.
                  </p>
                ) : null}
              </div>

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
                  value={planSearch}
                  onChange={(e) => setPlanSearch(e.target.value)}
                  placeholder="Search a Plan, e.g. 299 or 28 days"
                  className="w-full rounded-2xl border-0 bg-white py-3 pl-10 pr-3 text-[13px] shadow-sm ring-1 ring-[#e5e7eb] outline-none focus:ring-2 focus:ring-[#00baf2]"
                />
              </div>

              <div className="hide-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
                {[
                  "⚙",
                  "2 GB/Day Data",
                  "28 Days Validity",
                  "1.5 GB/Day",
                ].map((t, i) => (
                  <button
                    key={i}
                    type="button"
                    className="shrink-0 rounded-full border border-[#e5e7eb] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#444]"
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="hide-scrollbar mt-2 flex gap-4 overflow-x-auto border-b border-[#e5e7eb] pb-2">
                {RECHARGE_TABS.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setPlanTab(tab)}
                    className={`shrink-0 whitespace-nowrap border-b-2 pb-2 text-[12px] font-bold ${
                      planTab === tab
                        ? "border-[#00baf2] text-[#00baf2]"
                        : "border-transparent text-[#666]"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <ul className="mt-2 space-y-0 divide-y divide-[#eef0f3] rounded-xl bg-white ring-1 ring-[#eef0f3]">
                {filteredPlans.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPlan(p);
                        setStep("confirm");
                      }}
                      className="flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-[#fafafa]"
                    >
                      <span className="text-[18px] font-bold text-[#111]">
                        ₹{p.price}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex gap-4 text-[12px]">
                          <span className="text-[#888]">Validity</span>
                          <span className="font-semibold text-[#111]">
                            {p.validity}
                          </span>
                        </div>
                        <div className="flex gap-4 text-[12px]">
                          <span className="text-[#888]">Data</span>
                          <span className="font-semibold text-[#111]">
                            {p.data}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-[11px] text-[#64748b]">
                          {p.description}
                        </p>
                      </div>
                      <span className="text-[#bbb]" aria-hidden>
                        ›
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : null}

        {step === "confirm" && selected && selectedPlan ? (
          <div className="relative flex min-h-0 flex-1 flex-col bg-[#f0f2f5]">
            <header className="flex shrink-0 items-center gap-2 bg-white px-2 py-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmOpen(false);
                  setSelectedPlan(null);
                  setStep("plans");
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
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <OperatorCircle contactId={selected.id} size={36} />
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-bold text-[#111]">
                    {selected.name} — {formatInPhoneDisplay(selected.identifier)}
                  </p>
                  <p className="text-[11px] text-[#64748b]">
                    Prepaid · Delhi NCR
                  </p>
                </div>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-3">
              <div className="flex items-center gap-2 rounded-lg bg-[#e8f8ef] px-3 py-2.5">
                <span aria-hidden>📣</span>
                <p className="text-[12px] font-bold text-[#14532d]">
                  Congrats! No fee on UPI payment on this recharge.
                </p>
              </div>

              <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#e8eaed]">
                <p className="text-4xl font-bold text-[#111]">
                  ₹ {selectedPlan.price}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPlan(null);
                    setStep("plans");
                  }}
                  className="mt-1 text-[13px] font-bold text-[#00baf2]"
                >
                  Change Plan
                </button>
                <div className="mt-4 space-y-2 border-t border-[#f1f5f9] pt-3 text-[13px]">
                  <div className="flex justify-between">
                    <span className="text-[#888]">Validity</span>
                    <span className="font-semibold">{selectedPlan.validity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#888]">Data</span>
                    <span className="font-semibold">{selectedPlan.data}</span>
                  </div>
                </div>
                <p className="mt-3 text-[12px] leading-snug text-[#64748b]">
                  {selectedPlan.description}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-lg bg-[#e8f8ef] px-3 py-2">
                <span className="text-[11px] font-semibold text-[#166534]">
                  5% off on Axis Bank Neo Credit Card
                </span>
                <button
                  type="button"
                  className="text-[11px] font-bold text-[#00baf2]"
                >
                  View All &gt;
                </button>
              </div>
            </div>

            <div className="shrink-0 border-t border-[#e5e7eb] bg-white p-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="w-full rounded-xl bg-[#00baf2] py-3.5 text-[16px] font-bold text-white shadow-md"
              >
                Proceed to Pay
              </button>
            </div>

            {confirmOpen ? (
              <div className="absolute inset-0 z-10 flex flex-col justify-end bg-black/50">
                <div className="max-h-[55%] overflow-y-auto rounded-t-3xl bg-white px-4 pb-6 pt-4 shadow-[0_-8px_30px_rgba(0,0,0,0.15)]">
                  <p className="text-center text-[17px] font-bold text-[#111]">
                    Pay ₹{formatInrAmount(selectedPlan.price)} from
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
                    onClick={() => {
                      setConfirmOpen(false);
                      setPin("");
                      setPinError(null);
                      setStep("pin");
                    }}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#00baf2] py-3.5 text-[16px] font-bold text-white"
                  >
                    <span aria-hidden>🛡</span>
                    Pay Securely ₹{formatInrAmount(selectedPlan.price)}
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

        {step === "pin" && selected && selectedPlan ? (
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
                  setStep("confirm");
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
                  Pay ₹{formatInrAmount(selectedPlan.price)}
                </p>
                <p className="mt-1 text-[14px] text-[#555]">
                  Mobile recharge · {selected.name}
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
              Recharge for {successMeta.name}
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
