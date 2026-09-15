import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyToken } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { readFile } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

const SIG_DIR = path.join(process.cwd(), "uploads", "signatures");

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const authUser = await verifyToken(token);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [user] = await db.select({ signature: users.signature }).from(users).where(eq(users.id, authUser.id)).limit(1);

  if (!user?.signature) {
    return NextResponse.json({ error: "امضا ثبت نشده" }, { status: 404 });
  }

  const filePath = path.join(SIG_DIR, user.signature);
  if (!existsSync(filePath)) {
    return NextResponse.json({ error: "فایل امضا یافت نشد" }, { status: 404 });
  }

  const buffer = await readFile(filePath);
  const ext = path.extname(user.signature).toLowerCase();
  const mime = ext === ".png" ? "image/png" : "image/jpeg";

  return new NextResponse(buffer, {
    headers: { "Content-Type": mime, "Cache-Control": "public, max-age=3600" },
  });
}
