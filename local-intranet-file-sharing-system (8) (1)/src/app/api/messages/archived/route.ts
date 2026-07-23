import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { messages, users } from "@/db/schema";
import { getAuthFromRequest } from "@/lib/server-auth";
import { eq, desc, and, or } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authUser = await getAuthFromRequest(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const archivedMessages = await db.select({
    id: messages.id,
    subject: messages.subject,
    body: messages.body,
    attachmentFilename: messages.attachmentFilename,
    attachmentOriginalName: messages.attachmentOriginalName,
    attachmentSize: messages.attachmentSize,
    isRead: messages.isRead,
    createdAt: messages.createdAt,
    senderId: messages.senderId,
    receiverId: messages.receiverId,
    senderName: users.displayName,
    senderPosition: users.position,
    senderUsername: users.username,
  }).from(messages).innerJoin(users, eq(messages.senderId, users.id)).where(
    or(
      and(eq(messages.receiverId, authUser.id), eq(messages.receiverArchived, true)),
      and(eq(messages.senderId, authUser.id), eq(messages.senderArchived, true))
    )
  ).orderBy(desc(messages.createdAt));

  return NextResponse.json({ messages: archivedMessages });
}
