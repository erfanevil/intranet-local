import { apiOk } from "@/lib/auth/api";
import { destroySession } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  await destroySession();
  return apiOk({ redirectTo: "/auth/login" });
}
