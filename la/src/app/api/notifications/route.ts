import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { messages, files, chats, signatureRequests, users } from "@/db/schema";
import { getAuthFromRequest } from "@/lib/server-auth";
import { eq, and, desc, count } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authUser = await getAuthFromRequest(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [msgCount] = await db.select({ count: count() }).from(messages)
    .where(and(eq(messages.receiverId, authUser.id), eq(messages.isRead, false), eq(messages.receiverArchived, false)));

  const [fileCount] = await db.select({ count: count() }).from(files)
    .where(and(eq(files.receiverId, authUser.id), eq(files.isRead, false), eq(files.receiverArchived, false)));

  const [chatCount] = await db.select({ count: count() }).from(chats)
    .where(and(eq(chats.receiverId, authUser.id), eq(chats.isRead, false)));

  const [sigCount] = await db.select({ count: count() }).from(signatureRequests)
    .where(and(eq(signatureRequests.signerId, authUser.id), eq(signatureRequests.status, "pending")));

  const recentMessages = await db.select({
    id: messages.id, type: messages.subject, senderName: users.displayName, createdAt: messages.createdAt,
  }).from(messages).innerJoin(users, eq(messages.senderId, users.id))
    .where(and(eq(messages.receiverId, authUser.id), eq(messages.isRead, false), eq(messages.receiverArchived, false)))
    .orderBy(desc(messages.createdAt)).limit(5);

  const recentFiles = await db.select({
    id: files.id, type: files.originalName, senderName: users.displayName, createdAt: files.createdAt,
  }).from(files).innerJoin(users, eq(files.senderId, users.id))
    .where(and(eq(files.receiverId, authUser.id), eq(files.isRead, false), eq(files.receiverArchived, false)))
    .orderBy(desc(files.createdAt)).limit(5);

  const recentSigns = await db.select({
    id: signatureRequests.id, type: signatureRequests.documentOriginalName, senderName: users.displayName, createdAt: signatureRequests.createdAt,
  }).from(signatureRequests).innerJoin(users, eq(signatureRequests.senderId, users.id))
    .where(and(eq(signatureRequests.signerId, authUser.id), eq(signatureRequests.status, "pending")))
    .orderBy(desc(signatureRequests.createdAt)).limit(5);

  const notifications = [
    ...recentMessages.map(n => ({ ...n, kind: "message" as const, label: `نامه جدید: ${n.type}` })),
    ...recentFiles.map(n => ({ ...n, kind: "file" as const, label: `فایل جدید: ${n.type}` })),
    ...recentSigns.map(n => ({ ...n, kind: "signature" as const, label: `درخواست امضا: ${n.type}` })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);

  return NextResponse.json({
    counts: { messages: msgCount.count, files: fileCount.count, chats: chatCount.count, signatures: sigCount.count },
    total: msgCount.count + fileCount.count + chatCount.count + sigCount.count,
    notifications,
  });
}
