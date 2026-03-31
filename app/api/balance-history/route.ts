import { connectMongo } from "@/lib/mongodb";
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
};

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

function displayTime(t: LeanTx): Date {
  return t.simulatedAt ?? t.createdAt ?? new Date(0);
}

function formatCategoryLabel(tag: string): string {
  return tag
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectMongo();

  await User.updateOne(
    { _id: user.id, accountBalance: { $exists: false } },
    { $set: { accountBalance: 200_000 } },
  ).exec();

  const u = await User.findById(user.id)
    .select("accountBalance")
    .lean()
    .exec();
  const balRaw = (u as { accountBalance?: number } | null)?.accountBalance;
  const accountBalance =
    typeof balRaw === "number" && Number.isFinite(balRaw) ? balRaw : 200_000;

  const rawList = (await Transaction.find({ userId: user.id })
    .populate("contactId")
    .lean()
    .exec()) as unknown as LeanTx[];

  const sorted = rawList.sort(
    (a, b) => displayTime(b).getTime() - displayTime(a).getTime(),
  );

  const transactions = sorted.map((t) => {
    const at = displayTime(t);
    if (t.contactId) {
      const c = t.contactId;
      return {
        id: String(t._id),
        contactId: String(c._id),
        name: c.name,
        identifierType: c.identifierType,
        identifier: c.identifier,
        initials: c.initials,
        avatarColor: c.avatarColor,
        avatarImageUrl: c.avatarImageUrl,
        verified: c.verified,
        amount: t.amount,
        displayedAt: at.toISOString(),
        tag: "Money Transfer" as const,
      };
    }
    const rawTag = typeof t.qrTag === "string" && t.qrTag ? t.qrTag : "misc";
    const name = t.qrMerchantName ?? "Merchant";
    const identifier = t.qrIdentifier ?? "";
    const initials = t.qrInitials ?? "?";
    const avatarColor = t.qrAvatarColor ?? "#94a3b8";
    return {
      id: String(t._id),
      contactId: "",
      name,
      identifierType: "upi" as const,
      identifier,
      initials,
      avatarColor,
      avatarImageUrl: null as string | null,
      verified: true,
      amount: t.amount,
      displayedAt: at.toISOString(),
      tag: formatCategoryLabel(rawTag),
    };
  });

  return Response.json({ accountBalance, transactions });
}
