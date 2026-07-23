import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { messages } from "@/db/schema";
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

  const [msg] = await db.select().from(messages)
    .where(and(eq(messages.id, Number(id)), or(eq(messages.receiverId, authUser.id), eq(messages.senderId, authUser.id))))
    .limit(1);

  if (!msg) return NextResponse.json({ error: "نامه یافت نشد" }, { status: 404 });

  // Copy attachment if exists
  let newAttachmentFilename = null;
  if (msg.attachmentFilename) {
    try {
      await mkdir(UPLOAD_DIR, { recursive: true });
      const ext = path.extname(msg.attachmentFilename);
      newAttachmentFilename = `msg_${crypto.randomUUID()}${ext}`;
      const buffer = await readFile(path.join(UPLOAD_DIR, msg.attachmentFilename));
      await writeFile(path.join(UPLOAD_DIR, newAttachmentFilename), buffer);
    } catch {}
  }

  await db.insert(messages).values({
    subject: `ارجاع: ${msg.subject}`,
    body: msg.body,
    attachmentFilename: newAttachmentFilename,
    attachmentOriginalName: msg.attachmentOriginalName,
    attachmentSize: msg.attachmentSize,
    senderId: authUser.id,
    receiverId: Number(receiverId),
  });

  return NextResponse.json({ success: true });
}
