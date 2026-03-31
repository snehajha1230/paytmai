import { connectMongo } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import {
  getSessionTokenFromCookies,
  verifySessionToken,
} from "@/lib/auth-session";

export type PublicUser = {
  id: string;
  email: string;
  displayName: string;
  phone: string | null;
};

export async function getCurrentUser(): Promise<PublicUser | null> {
  try {
    await connectMongo();
  } catch {
    return null;
  }

  const token = await getSessionTokenFromCookies();
  if (!token) return null;
  const payload = await verifySessionToken(token);
  if (!payload) return null;

  try {
    const found = await User.find({ _id: payload.sub })
      .limit(1)
      .lean()
      .exec();
    const user = found[0];
    if (!user) return null;

    return {
      id: String(user._id),
      email: user.email,
      displayName: user.displayName,
      phone: user.phone ?? null,
    };
  } catch {
    return null;
  }
}
