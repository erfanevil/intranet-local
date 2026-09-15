import { handleRequestOtp } from "@/lib/auth/otp-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleRequestOtp(request, "reset");
}
