import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getAuthFromRequest } from "@/lib/server-auth";
import { ne } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authUser = await getAuthFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allUsers = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      position: users.position,
      avatar: users.avatar,
      isOnline: users.isOnline,
      lastSeen: users.lastSeen,
    })
    .from(users)
    .where(ne(users.id, authUser.id));

  return NextResponse.json({ users: allUsers });
}
