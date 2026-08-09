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

  const [result] = await db
    .select({ count: count() })
    .from(chats)
    .where(
      and(
        eq(chats.receiverId, authUser.id),
        eq(chats.isRead, false)
      )
    );

  return NextResponse.json({ count: result.count });
}
