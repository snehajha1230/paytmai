import { connectMongo } from "@/lib/mongodb";
import { Contact } from "@/lib/models/Contact";
import { Transaction } from "@/lib/models/Transaction";
import { User } from "@/lib/models/User";
import { getCurrentUser } from "@/lib/session-user";
import type { Types } from "mongoose";

export const runtime = "nodejs";

type LeanContact = {
  _id: Types.ObjectId;
  name: string;
  identifierType: "phone" | "upi";
  identifier: string;
  initials: string;
  avatarColor: string;
  avatarImageUrl: string | null;
  verified: boolean;
  starredSuggestion: boolean;
  sortOrder: number;
};

function serializeContact(
  c: LeanContact,
  favoriteIds: Set<string>,
) {
  const id = String(c._id);
  return {
    id,
    name: c.name,
    identifierType: c.identifierType,
    identifier: c.identifier,
    initials: c.initials,
    avatarColor: c.avatarColor,
    avatarImageUrl: c.avatarImageUrl,
    verified: c.verified,
    starredSuggestion: c.starredSuggestion,
    favorite: favoriteIds.has(id),
  };
}

type LeanTx = {
  _id: Types.ObjectId;
  amount: number;
  contactId: LeanContact | null;
  qrMerchantName?: string;
  qrIdentifier?: string;
  qrInitials?: string;
  qrAvatarColor?: string;
  qrTag?: string;
  createdAt?: Date;
  simulatedAt?: Date | null;
};

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectMongo();

  const u = await User.findById(user.id)
    .select("favoriteContactIds")
    .lean()
    .exec();
  const favList = (
    u as { favoriteContactIds?: unknown[] } | null
  )?.favoriteContactIds;
  const favoriteIds = new Set((favList ?? []).map((x) => String(x)));

  const contactsRaw = await Contact.find({})
    .sort({ sortOrder: 1 })
    .lean()
    .exec();

  const contacts = contactsRaw.map((c) =>
    serializeContact(c as unknown as LeanContact, favoriteIds),
  );

  const recentRaw = (await Transaction.find({ userId: user.id })
    .sort({ createdAt: -1 })
    .limit(12)
    .populate("contactId")
    .lean()
    .exec()) as unknown as LeanTx[];

  const recent = recentRaw.map((t) => {
    const sentAt = (
      t.simulatedAt ??
      t.createdAt ??
      new Date(0)
    ).toISOString();
    if (t.contactId) {
      const c = t.contactId;
      return {
        transactionId: String(t._id),
        contactId: String(c._id),
        name: c.name,
        identifierType: c.identifierType,
        identifier: c.identifier,
        initials: c.initials,
        avatarColor: c.avatarColor,
        avatarImageUrl: c.avatarImageUrl,
        verified: c.verified,
        favorite: favoriteIds.has(String(c._id)),
        amount: t.amount,
        sentAt,
        isQr: false as const,
      };
    }
    return {
      transactionId: String(t._id),
      contactId: "",
      name: t.qrMerchantName ?? "Merchant",
      identifierType: "upi" as const,
      identifier: t.qrIdentifier ?? "",
      initials: t.qrInitials ?? "?",
      avatarColor: t.qrAvatarColor ?? "#94a3b8",
      avatarImageUrl: null as string | null,
      verified: true,
      favorite: false,
      amount: t.amount,
      sentAt,
      isQr: true as const,
      categoryTag: t.qrTag ?? "misc",
    };
  });

  return Response.json({ contacts, recent });
}
