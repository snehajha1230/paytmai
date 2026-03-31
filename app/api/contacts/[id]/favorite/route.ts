import mongoose from "mongoose";
import { connectMongo } from "@/lib/mongodb";
import { Contact } from "@/lib/models/Contact";
import { User } from "@/lib/models/User";
import { getCurrentUser } from "@/lib/session-user";

export const runtime = "nodejs";

export async function PATCH(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!mongoose.isValidObjectId(id)) {
    return Response.json({ error: "Invalid contact" }, { status: 400 });
  }

  await connectMongo();

  const exists = await Contact.findById(id).select("_id").lean().exec();
  if (!exists) {
    return Response.json({ error: "Contact not found" }, { status: 404 });
  }

  const u = await User.findById(user.id).exec();
  if (!u) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const prev: string[] = (u.favoriteContactIds ?? []).map((x: unknown) =>
    String(x),
  );
  const had = prev.includes(id);
  const next: string[] = had ? prev.filter((x: string) => x !== id) : [...prev, id];
  u.favoriteContactIds = next.map((x: string) => new mongoose.Types.ObjectId(x));
  await u.save();

  return Response.json({ favorite: !had });
}
