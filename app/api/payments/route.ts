import mongoose from "mongoose";
import { connectMongo } from "@/lib/mongodb";
import { Contact } from "@/lib/models/Contact";
import { Transaction } from "@/lib/models/Transaction";
import { getCurrentUser } from "@/lib/session-user";

export const runtime = "nodejs";

function demoPin() {
  return process.env.DEMO_UPI_PIN ?? "111111";
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

  const { contactId, amount, message, upiPin } = body as Record<
    string,
    unknown
  >;

  if (typeof contactId !== "string" || !mongoose.isValidObjectId(contactId)) {
    return Response.json({ error: "Invalid contact" }, { status: 400 });
  }

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

  const msg =
    typeof message === "string" ? message.slice(0, 280) : "";

  await connectMongo();

  const contact = await Contact.findById(contactId).select("_id").lean().exec();
  if (!contact) {
    return Response.json({ error: "Contact not found" }, { status: 404 });
  }

  const doc = await Transaction.create({
    userId: user.id,
    contactId,
    amount: rounded,
    message: msg,
    status: "completed",
  });

  return Response.json({
    ok: true,
    transactionId: String(doc._id),
    amount: rounded,
    paidAt: doc.createdAt?.toISOString() ?? new Date().toISOString(),
  });
}
