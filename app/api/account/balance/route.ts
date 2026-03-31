import { connectMongo } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { getCurrentUser } from "@/lib/session-user";

export const runtime = "nodejs";

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

  const raw = (u as { accountBalance?: number } | null)?.accountBalance;
  const accountBalance =
    typeof raw === "number" && Number.isFinite(raw) ? raw : 200_000;

  return Response.json({ accountBalance });
}
