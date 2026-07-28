import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { messages, messageAttachments, users } from "@/db/schema";
import { getAuthFromRequest } from "@/lib/server-auth";
import { eq, desc, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authUser = await getAuthFromRequest(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sent = await db.select({
    id: messages.id, subject: messages.subject, body: messages.body,
    attachmentFilename: messages.attachmentFilename, attachmentOriginalName: messages.attachmentOriginalName,
    attachmentSize: messages.attachmentSize, isRead: messages.isRead, createdAt: messages.createdAt,
    receiverName: users.displayName, receiverPosition: users.position,
  }).from(messages).innerJoin(users, eq(messages.receiverId, users.id))
    .where(and(eq(messages.senderId, authUser.id), eq(messages.senderArchived, false)))
    .orderBy(desc(messages.createdAt));

  const messagesWithAttachments = await Promise.all(
    sent.map(async (msg) => {
      const extraAttachments = await db
        .select({ id: messageAttachments.id, filename: messageAttachments.filename, originalName: messageAttachments.originalName, size: messageAttachments.size, mimeType: messageAttachments.mimeType })
        .from(messageAttachments).where(eq(messageAttachments.messageId, msg.id));
      return { ...msg, extraAttachments };
    })
  );

  return NextResponse.json({ messages: messagesWithAttachments });
}
