import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { files } from "@/db/schema";
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

  const [file] = await db
    .select()
    .from(files)
    .where(
      and(
        eq(files.id, Number(id)),
        or(
          eq(files.receiverId, authUser.id),
          eq(files.senderId, authUser.id)
        )
      )
    )
    .limit(1);

  if (!file) {
    return NextResponse.json({ error: "فایل یافت نشد" }, { status: 404 });
  }

  // Mark as read if receiver
  if (file.receiverId === authUser.id) {
    await db.update(files).set({ isRead: true }).where(eq(files.id, file.id));
  }

  const filePath = path.join(UPLOAD_DIR, file.filename);
  
  if (!existsSync(filePath)) {
    return NextResponse.json({ error: "فایل روی سرور یافت نشد" }, { status: 404 });
  }

  const buffer = await readFile(filePath);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(file.originalName)}"`,
      "Content-Length": String(buffer.length),
    },
  });
}
