import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { files, users } from "@/db/schema";
import { getAuthFromRequest } from "@/lib/server-auth";
import { eq, desc, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authUser = await getAuthFromRequest(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sent = await db.select({
    id: files.id, originalName: files.originalName, mimeType: files.mimeType,
    size: files.size, isRead: files.isRead, createdAt: files.createdAt,
    receiverName: users.displayName, receiverUsername: users.username,
  }).from(files).innerJoin(users, eq(files.receiverId, users.id))
    .where(and(eq(files.senderId, authUser.id), eq(files.senderArchived, false)))
    .orderBy(desc(files.createdAt));

  return NextResponse.json({ files: sent });
}
