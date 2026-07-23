import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { files } from "@/db/schema";
import { getAuthFromRequest } from "@/lib/server-auth";
import { eq, and, or } from "drizzle-orm";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthFromRequest(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { receiverId } = await request.json();

  if (!receiverId) return NextResponse.json({ error: "گیرنده الزامی است" }, { status: 400 });

  const [file] = await db.select().from(files)
    .where(and(eq(files.id, Number(id)), or(eq(files.receiverId, authUser.id), eq(files.senderId, authUser.id))))
    .limit(1);

  if (!file) return NextResponse.json({ error: "فایل یافت نشد" }, { status: 404 });

  // Copy file with new name
  await mkdir(UPLOAD_DIR, { recursive: true });
  const ext = path.extname(file.originalName);
  const newFilename = `${crypto.randomUUID()}${ext}`;
  const buffer = await readFile(path.join(UPLOAD_DIR, file.filename));
  await writeFile(path.join(UPLOAD_DIR, newFilename), buffer);

  await db.insert(files).values({
    filename: newFilename,
    originalName: file.originalName,
    mimeType: file.mimeType,
    size: file.size,
    senderId: authUser.id,
    receiverId: Number(receiverId),
  });

  return NextResponse.json({ success: true });
}
