import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { files, users } from "@/db/schema";
import { getAuthFromRequest } from "@/lib/server-auth";
import { eq, desc, and, or } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authUser = await getAuthFromRequest(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const archivedFiles = await db.select({
    id: files.id,
    originalName: files.originalName,
    mimeType: files.mimeType,
    size: files.size,
    isRead: files.isRead,
    createdAt: files.createdAt,
    senderId: files.senderId,
    receiverId: files.receiverId,
    senderName: users.displayName,
    senderUsername: users.username,
  }).from(files).innerJoin(users, eq(files.senderId, users.id)).where(
    or(
      and(eq(files.receiverId, authUser.id), eq(files.receiverArchived, true)),
      and(eq(files.senderId, authUser.id), eq(files.senderArchived, true))
    )
  ).orderBy(desc(files.createdAt));

  return NextResponse.json({ files: archivedFiles });
}
