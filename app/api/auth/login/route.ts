import { connectMongo } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { setSessionCookie, signSessionToken } from "@/lib/auth-session";

export const runtime = "nodejs";

export async function POST() {
  await connectMongo();

  const found = await User.find({})
    .sort({ createdAt: 1 })
    .limit(1)
    .lean()
    .exec();
  const user = found[0];
  if (!user) {
    return Response.json(
      { error: "No account configured. Run npm run db:seed on your MongoDB." },
      { status: 503 },
    );
  }

  const id = String(user._id);
  const token = await signSessionToken(id);
  await setSessionCookie(token);

  return Response.json({
    user: {
      id,
      email: user.email,
      displayName: user.displayName,
      phone: user.phone ?? null,
    },
  });
}
