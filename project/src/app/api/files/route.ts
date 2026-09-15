import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { files, users } from "@/db/schema";
import { getAuthFromRequest } from "@/lib/server-auth";
import { eq, desc, and } from "drizzle-orm";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authUser = await getAuthFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const receivedFiles = await db
    .select({
      id: files.id,
      originalName: files.originalName,
      mimeType: files.mimeType,
      size: files.size,
      isRead: files.isRead,
      createdAt: files.createdAt,
      senderName: users.displayName,
      senderUsername: users.username,
    })
    .from(files)
    .innerJoin(users, eq(files.senderId, users.id))
    .where(and(eq(files.receiverId, authUser.id), eq(files.receiverArchived, false)))
    .orderBy(desc(files.createdAt));

  return NextResponse.json({ files: receivedFiles });
}

export async function POST(request: NextRequest) {
  const authUser = await getAuthFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const receiverId = formData.get("receiverId") as string | null;

    if (!file || !receiverId) {
      return NextResponse.json(
        { error: "فایل و گیرنده الزامی است" },
        { status: 400 }
      );
    }

    await mkdir(UPLOAD_DIR, { recursive: true });

    const ext = path.extname(file.name);
    const filename = `${crypto.randomUUID()}${ext}`;
    const filePath = path.join(UPLOAD_DIR, filename);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(filePath, buffer);

    const [savedFile] = await db
      .insert(files)
      .values({
        filename,
        originalName: file.name,
        mimeType: file.type || "application/octet-stream",
        size: buffer.length,
        senderId: authUser.id,
        receiverId: Number(receiverId),
      })
      .returning();

    return NextResponse.json({ success: true, file: savedFile });
  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json({ error: "خطای آپلود" }, { status: 500 });
  }
}
