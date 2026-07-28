import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getAuthFromRequest } from "@/lib/server-auth";
import { eq, ne, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authUser = await getAuthFromRequest(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { isOnline } = await request.json();

  await db.update(users).set({
    isOnline: isOnline || false,
    lastSeen: new Date(),
  }).where(eq(users.id, authUser.id));

  // Mark users as offline if they haven't sent heartbeat in 60 seconds
  await db.update(users).set({ isOnline: false }).where(
    sql`${users.isOnline} = true AND ${users.lastSeen} < NOW() - INTERVAL '60 seconds'`
  );

  return NextResponse.json({ success: true });
}

export async function GET(request: NextRequest) {
  const authUser = await getAuthFromRequest(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Mark stale users as offline
  await db.update(users).set({ isOnline: false }).where(
    sql`${users.isOnline} = true AND ${users.lastSeen} < NOW() - INTERVAL '60 seconds'`
  );

  const allUsers = await db.select({
    id: users.id,
    username: users.username,
    displayName: users.displayName,
    position: users.position,
    avatar: users.avatar,
    isOnline: users.isOnline,
    lastSeen: users.lastSeen,
  }).from(users).where(ne(users.id, authUser.id));

  return NextResponse.json({ users: allUsers });
}
