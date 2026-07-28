import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { messageAttachments, messages } from "@/db/schema";
import { verifyToken } from "@/lib/auth";
import { eq, and, or } from "drizzle-orm";
import { readFile } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ attachId: string }> }
) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const authUser = await verifyToken(token);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { attachId } = await params;

  const [att] = await db.select().from(messageAttachments).where(eq(messageAttachments.id, Number(attachId))).limit(1);
  if (!att) return NextResponse.json({ error: "فایل یافت نشد" }, { status: 404 });

  // Check access
  const [msg] = await db.select().from(messages)
    .where(and(eq(messages.id, att.messageId), or(eq(messages.senderId, authUser.id), eq(messages.receiverId, authUser.id))))
    .limit(1);
  if (!msg) return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });

  const filePath = path.join(UPLOAD_DIR, att.filename);
  if (!existsSync(filePath)) return NextResponse.json({ error: "فایل روی سرور یافت نشد" }, { status: 404 });

  const buffer = await readFile(filePath);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": att.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(att.originalName)}"`,
      "Content-Length": String(buffer.length),
    },
  });
}
