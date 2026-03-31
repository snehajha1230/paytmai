"use client";

import { useState } from "react";
import BalanceHistoryModal from "@/app/components/BalanceHistoryModal";
import PayAnyoneFlow from "@/app/components/PayAnyoneFlow";
import ScanAnyQrFlow from "@/app/components/ScanAnyQrFlow";
import BankTransferModal from "@/app/components/BankTransferModal";

function IconCircle({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#00468c] text-white shadow-sm sm:h-14 sm:w-14">
      {children}
    </span>
  );
}

function ScanQrIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        stroke="currentColor"
        strokeWidth="1.6"
        d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 5h3v3h-3v-3zm3-5h3v3h-3v-3zm-3 8h6v3h-6v-3z"
      />
    </svg>
  );
}

function PayAnyoneIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        d="M4 19v-1a5 5 0 015-5h1M15 5l3-2M15 9l3 2M18 7h4"
      />
    </svg>
  );
}

function BankIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        d="M3 10h18M5 10v9M10 10v9M14 10v9M19 10v9M2 22h20M4 10l8-6 8 6"
      />
    </svg>
  );
}

function BalanceHistoryIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        d="M6 4h12a1 1 0 011 1v14a1 1 0 01-1 1H6a1 1 0 01-1-1V5a1 1 0 011-1z"
      />
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        d="M8 9h8M8 13h5M8 17h7"
      />
      <text
        x="14.5"
        y="12.5"
        fill="currentColor"
        fontSize="7"
        fontWeight="700"
        className="font-sans"
      >
        ₹
      </text>
    </svg>
  );
}

const actions = [
  { id: "scan" as const, label: ["Scan any", "QR"], icon: <ScanQrIcon /> },
  { id: "payAnyone" as const, label: ["Pay", "Anyone"], icon: <PayAnyoneIcon /> },
  { id: "bank" as const, label: ["Bank", "Transfer"], icon: <BankIcon /> },
  {
    id: "balance" as const,
    label: ["Balance &", "History"],
    icon: <BalanceHistoryIcon />,
  },
] as const;

export default function UpiMoneyTransfer() {
  const [payAnyoneOpen, setPayAnyoneOpen] = useState(false);
  const [scanQrOpen, setScanQrOpen] = useState(false);
  const [balanceHistoryOpen, setBalanceHistoryOpen] = useState(false);
  const [bankTransferOpen, setBankTransferOpen] = useState(false);

  return (
    <section className="rounded-[18px] bg-white px-5 py-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)] sm:px-8 sm:py-6 md:px-10">
      <BalanceHistoryModal
        open={balanceHistoryOpen}
        onClose={() => setBalanceHistoryOpen(false)}
      />
      <ScanAnyQrFlow open={scanQrOpen} onClose={() => setScanQrOpen(false)} />
      <BankTransferModal
        open={bankTransferOpen}
        onClose={() => setBankTransferOpen(false)}
      />
      <PayAnyoneFlow open={payAnyoneOpen} onClose={() => setPayAnyoneOpen(false)} />
      <h2 className="text-base font-bold text-[#333] md:text-lg">
        UPI Money Transfer
      </h2>
      <div className="mt-6 grid grid-cols-2 gap-8 sm:grid-cols-4 sm:gap-6 md:gap-10">
        {actions.map((a) => (
          <button
            key={a.label.join("-")}
            type="button"
            onClick={() => {
              if (a.id === "scan") setScanQrOpen(true);
              if (a.id === "payAnyone") setPayAnyoneOpen(true);
              if (a.id === "balance") setBalanceHistoryOpen(true);
              if (a.id === "bank") setBankTransferOpen(true);
            }}
            className="flex flex-col items-center gap-2.5 text-center transition-opacity hover:opacity-90"
          >
            <IconCircle>{a.icon}</IconCircle>
            <span className="text-[11px] font-semibold leading-tight text-[#333] sm:text-xs">
              {a.label.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
