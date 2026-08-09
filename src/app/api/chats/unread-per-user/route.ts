import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { chats } from "@/db/schema";
import { getAuthFromRequest } from "@/lib/server-auth";
import { eq, and, count } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authUser = await getAuthFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await db
    .select({
      senderId: chats.senderId,
      count: count(),
    })
    .from(chats)
    .where(
      and(
        eq(chats.receiverId, authUser.id),
        eq(chats.isRead, false)
      )
    )
    .groupBy(chats.senderId);

  // Convert to { userId: count } object
  const unreadMap: Record<number, number> = {};
  for (const r of results) {
    unreadMap[r.senderId] = r.count;
  }

  return NextResponse.json({ unread: unreadMap });
}
