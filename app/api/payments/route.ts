import mongoose from "mongoose";
import { QR_TAG_OPTIONS } from "@/lib/qr-payee";
import { connectMongo } from "@/lib/mongodb";
import { Contact } from "@/lib/models/Contact";
import { Transaction } from "@/lib/models/Transaction";
import { User } from "@/lib/models/User";
import { getCurrentUser } from "@/lib/session-user";

export const runtime = "nodejs";

const EIGHT_H_MS = 8 * 60 * 60 * 1000;

const TAG_SET = new Set<string>(QR_TAG_OPTIONS);

function demoPin() {
  return process.env.DEMO_UPI_PIN ?? "111111";
}

function normalizeMsg(raw: unknown): string {
  return typeof raw === "string" ? raw.slice(0, 280) : "";
}

function parseCategoryTag(b: Record<string, unknown>): string | null {
  if (typeof b.tag === "string") {
    const t = b.tag.trim().toLowerCase();
    if (TAG_SET.has(t)) return t;
  }
  const tagsRaw = b.tags;
  if (Array.isArray(tagsRaw)) {
    for (const item of tagsRaw) {
      if (typeof item !== "string") continue;
      const t = item.trim().toLowerCase();
      if (TAG_SET.has(t)) return t;
    }
  }
  return null;
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const amount = b.amount;
  const upiPin = b.upiPin;
  const message = normalizeMsg(b.message);

  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    return Response.json({ error: "Invalid amount" }, { status: 400 });
  }

  const rounded = Math.round(amount * 100) / 100;
  if (rounded > 99_999_999) {
    return Response.json({ error: "Amount too large" }, { status: 400 });
  }

  if (typeof upiPin !== "string" || upiPin !== demoPin()) {
    return Response.json({ error: "Incorrect UPI PIN" }, { status: 400 });
  }

  let userOid: mongoose.Types.ObjectId;
  try {
    userOid = new mongoose.Types.ObjectId(user.id);
  } catch {
    return Response.json({ error: "Invalid session" }, { status: 401 });
  }

  await connectMongo();

  await User.updateOne(
    { _id: userOid, accountBalance: { $exists: false } },
    { $set: { accountBalance: 200_000 } },
  ).exec();

  const updated = await User.findOneAndUpdate(
    { _id: userOid, accountBalance: { $gte: rounded } },
    { $inc: { accountBalance: -rounded } },
    { new: true },
  )
    .select("accountBalance")
    .lean()
    .exec();

  if (!updated) {
    return Response.json(
      { error: "Insufficient account balance" },
      { status: 400 },
    );
  }

  const lastTx = (await Transaction.findOne({ userId: userOid })
    .sort({ createdAt: -1 })
    .select("simulatedAt createdAt")
    .lean()
    .exec()) as {
    simulatedAt?: Date;
    createdAt?: Date;
  } | null;

  const prev = lastTx?.simulatedAt ?? lastTx?.createdAt ?? null;
  const simulatedAt = prev
    ? new Date(prev.getTime() + EIGHT_H_MS)
    : new Date();

  const kind = b.kind;
  let doc;

  const refund = () =>
    User.updateOne({ _id: userOid }, { $inc: { accountBalance: rounded } }).exec();

  try {
    if (kind === "qr") {
      const merchantName = b.merchantName;
      const identifier = b.identifier;
      const initials = b.initials;
      const avatarColor = b.avatarColor;

      if (typeof merchantName !== "string" || merchantName.trim().length < 1) {
        await refund();
        return Response.json({ error: "Invalid merchant" }, { status: 400 });
      }
      const nameTrim = merchantName.trim().slice(0, 120);
      if (typeof identifier !== "string" || identifier.trim().length < 3) {
        await refund();
        return Response.json({ error: "Invalid UPI id" }, { status: 400 });
      }
      const idTrim = identifier.trim().slice(0, 120);
      if (typeof initials !== "string" || initials.trim().length < 1) {
        await refund();
        return Response.json({ error: "Invalid initials" }, { status: 400 });
      }
      const iniTrim = initials.trim().slice(0, 8);
      if (
        typeof avatarColor !== "string" ||
        !/^#[0-9a-fA-F]{6}$/.test(avatarColor.trim())
      ) {
        await refund();
        return Response.json(
          { error: "Invalid avatar color" },
          { status: 400 },
        );
      }

      const categoryTag = parseCategoryTag(b);
      if (!categoryTag) {
        await refund();
        return Response.json({ error: "Invalid category tag" }, { status: 400 });
      }

      doc = await Transaction.create({
        userId: userOid,
        amount: rounded,
        message,
        status: "completed",
        simulatedAt,
        qrMerchantName: nameTrim,
        qrIdentifier: idTrim,
        qrInitials: iniTrim,
        qrAvatarColor: avatarColor.trim(),
        qrTag: categoryTag,
      });
    } else {
      const contactId = b.contactId;
      if (
        typeof contactId !== "string" ||
        !mongoose.isValidObjectId(contactId)
      ) {
        await refund();
        return Response.json({ error: "Invalid contact" }, { status: 400 });
      }

      const contact = await Contact.findById(contactId)
        .select("_id")
        .lean()
        .exec();
      if (!contact) {
        await refund();
        return Response.json({ error: "Contact not found" }, { status: 404 });
      }

      doc = await Transaction.create({
        userId: userOid,
        contactId: new mongoose.Types.ObjectId(contactId),
        amount: rounded,
        message,
        status: "completed",
        simulatedAt,
      });
    }
  } catch (err) {
    await refund();
    console.error("[payments] Transaction.create failed:", err);
    return Response.json(
      { error: "Failed to record transaction" },
      { status: 500 },
    );
  }

  return Response.json({
    ok: true,
    transactionId: String(doc._id),
    amount: rounded,
    paidAt: simulatedAt.toISOString(),
  });
}
