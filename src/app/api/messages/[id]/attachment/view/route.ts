import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { verifyToken } from "@/lib/auth";
import { eq, and, or } from "drizzle-orm";
import { readFile } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

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

  const [msg] = await db.select().from(messages)
    .where(and(eq(messages.id, Number(id)), or(eq(messages.receiverId, authUser.id), eq(messages.senderId, authUser.id))))
    .limit(1);

  if (!msg || !msg.attachmentFilename) return NextResponse.json({ error: "فایل یافت نشد" }, { status: 404 });

  const filePath = path.join(UPLOAD_DIR, msg.attachmentFilename);
  if (!existsSync(filePath)) return NextResponse.json({ error: "فایل یافت نشد" }, { status: 404 });

  const buffer = await readFile(filePath);
  const ext = path.extname(msg.attachmentFilename).toLowerCase();
  const mimeMap: Record<string, string> = {
    ".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".gif": "image/gif", ".webp": "image/webp", ".txt": "text/plain",
    ".doc": "application/msword", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel", ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": mimeMap[ext] || "application/octet-stream",
      "Content-Disposition": `inline; filename="${encodeURIComponent(msg.attachmentOriginalName || "file")}"`,
      "Content-Length": String(buffer.length),
    },
  });
}
