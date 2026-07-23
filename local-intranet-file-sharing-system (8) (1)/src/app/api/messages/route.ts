import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { messages, users } from "@/db/schema";
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

  const receivedMessages = await db
    .select({
      id: messages.id,
      subject: messages.subject,
      body: messages.body,
      attachmentFilename: messages.attachmentFilename,
      attachmentOriginalName: messages.attachmentOriginalName,
      attachmentSize: messages.attachmentSize,
      isRead: messages.isRead,
      createdAt: messages.createdAt,
      senderName: users.displayName,
      senderPosition: users.position,
      senderUsername: users.username,
    })
    .from(messages)
    .innerJoin(users, eq(messages.senderId, users.id))
    .where(and(eq(messages.receiverId, authUser.id), eq(messages.receiverArchived, false)))
    .orderBy(desc(messages.createdAt));

  return NextResponse.json({ messages: receivedMessages });
}

export async function POST(request: NextRequest) {
  const authUser = await getAuthFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const subject = formData.get("subject") as string;
    const body = formData.get("body") as string;
    const receiverId = formData.get("receiverId") as string;
    const attachment = formData.get("attachment") as File | null;

    if (!subject || !body || !receiverId) {
      return NextResponse.json(
        { error: "تمام فیلدها الزامی است" },
        { status: 400 }
      );
    }

    let attachmentFilename = null;
    let attachmentOriginalName = null;
    let attachmentSize = null;

    if (attachment && attachment.size > 0) {
      await mkdir(UPLOAD_DIR, { recursive: true });
      
      const ext = path.extname(attachment.name);
      attachmentFilename = `msg_${crypto.randomUUID()}${ext}`;
      attachmentOriginalName = attachment.name;
      attachmentSize = attachment.size;

      const arrayBuffer = await attachment.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await writeFile(path.join(UPLOAD_DIR, attachmentFilename), buffer);
    }

    const [msg] = await db
      .insert(messages)
      .values({
        subject,
        body,
        attachmentFilename,
        attachmentOriginalName,
        attachmentSize,
        senderId: authUser.id,
        receiverId: Number(receiverId),
      })
      .returning();

    return NextResponse.json({ success: true, message: msg });
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
