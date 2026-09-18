import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/server-auth";
import { codes } from "../send-code/route";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authUser = await getAuthFromRequest(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { code } = await request.json();
    if (!code) return NextResponse.json({ error: "کد الزامی است" }, { status: 400 });

    const stored = codes.get(authUser.id);

    if (!stored) {
      return NextResponse.json({ error: "کدی ارسال نشده. دوباره درخواست کنید." }, { status: 400 });
    }

    if (Date.now() > stored.expires) {
      codes.delete(authUser.id);
      return NextResponse.json({ error: "کد منقضی شده. دوباره درخواست کنید." }, { status: 400 });
    }

    if (stored.code !== String(code).trim()) {
      return NextResponse.json({ error: "کد وارد شده اشتباه است" }, { status: 400 });
    }

    // Code is correct - delete it
    codes.delete(authUser.id);

    return NextResponse.json({ success: true, verified: true });
  } catch (error) {
    console.error("Verify error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
