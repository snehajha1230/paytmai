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
  /** Single spend category for QR / merchant pay (matches QR_TAG_OPTIONS) */
  categoryTag?: string;
  /** When true, POST /api/payments with kind "qr" */
  qrPayment?: boolean;
};
