import type { PayAnyoneContact } from "@/lib/payee-types";

export const QR_TAG_OPTIONS = [
  "food",
  "shopping",
  "entertainment",
  "fuel",
  "travel",
  "bill payments",
  "groceries",
  "misc",
] as const;

const MERCHANT_NAMES = [
  "Fresh Bites Cafe",
  "Metro Mart",
  "City Fuels",
  "Quick Recharge Hub",
  "Star Cinema",
  "Green Grocer",
  "TravelEase",
  "Urban Style",
  "Spice Route",
  "Cloud Bill Pay",
] as const;

const UPI_HANDLES = [
  "okaxis",
  "ybl",
  "oksbi",
  "okhdfcbank",
  "paytm",
  "ibl",
] as const;

const AVATAR_COLORS = [
  "#c4b5fd",
  "#86efac",
  "#f9a8d4",
  "#fde047",
  "#7dd3fc",
  "#fdba74",
  "#a5b4fc",
  "#6ee7b7",
] as const;

function randomItem<T extends readonly unknown[]>(arr: T): T[number] {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function initialsFromName(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) return "?";
  return parts.map((p) => p[0]!.toUpperCase()).join("");
}

function randomUpiSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 12);
  const suffix = Math.floor(100 + Math.random() * 900);
  return `${base || "merchant"}${suffix}`;
}

export type QrPayee = PayAnyoneContact & { categoryTag: string };

export function generateQrPayee(): QrPayee {
  const name = randomItem(MERCHANT_NAMES);
  const handle = randomItem(UPI_HANDLES);
  const categoryTag = randomItem(QR_TAG_OPTIONS);

  return {
    id: "qr-merchant",
    name,
    identifierType: "upi",
    identifier: `${randomUpiSlug(name)}@${handle}`,
    initials: initialsFromName(name),
    avatarColor: randomItem(AVATAR_COLORS),
    avatarImageUrl: null,
    verified: Math.random() > 0.4,
    starredSuggestion: false,
    favorite: false,
    categoryTag,
    qrPayment: true,
  };
}
