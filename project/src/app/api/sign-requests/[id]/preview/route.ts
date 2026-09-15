import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { signatureRequests } from "@/db/schema";
import { verifyToken } from "@/lib/auth";
import { eq } from "drizzle-orm";
import path from "path";

type PreviewResponse =
  | { mode: "image"; url: string; filename: string }
  | { mode: "pdf"; url: string; filename: string }
  | { mode: "unsupported"; message: string; filename: string };

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const authUser = await verifyToken(token);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [req] = await db.select().from(signatureRequests).where(eq(signatureRequests.id, Number(id))).limit(1);
  if (!req) return NextResponse.json({ error: "یافت نشد" }, { status: 404 });

  const ext = path.extname(req.documentFilename).toLowerCase();
  const fileUrl = `/api/sign-requests/${req.id}/document?token=${encodeURIComponent(token)}`;

  let response: PreviewResponse;

  if ([".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext)) {
    response = { mode: "image", url: fileUrl, filename: req.documentOriginalName };
    return NextResponse.json(response);
  }

  if (ext === ".pdf") {
    response = { mode: "pdf", url: fileUrl, filename: req.documentOriginalName };
    return NextResponse.json(response);
  }

  response = {
    mode: "unsupported",
    message: "در بخش امضا فقط فایل‌های تصویری و PDF پشتیبانی می‌شوند. برای فایل‌های Word از دکمه مشاهده در نامه‌ها/فایل‌ها استفاده کنید تا مستقیم در Word باز شوند.",
    filename: req.documentOriginalName,
  };

  return NextResponse.json(response);
}
