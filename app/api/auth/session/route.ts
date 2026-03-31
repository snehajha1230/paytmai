import { getCurrentUser } from "@/lib/session-user";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  return Response.json({ user });
}
