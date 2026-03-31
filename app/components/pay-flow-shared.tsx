import type { PayAnyoneContact } from "@/lib/payee-types";

export function formatInrAmount(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(n);
}

export function UpiAppLogos() {
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

export function AvatarBubble({
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

export function VerifiedBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#2563eb] text-[11px] font-bold text-white ${className}`}
      aria-label="Verified"
    >
      ✓
    </span>
  );
}

export function AmountKeypad({
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

export function PinKeypad({
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

export function SuccessDecor() {
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
