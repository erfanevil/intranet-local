import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getAuthFromRequest } from "@/lib/server-auth";
import { eq, ne, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authUser = await getAuthFromRequest(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const signers = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      position: users.position,
    })
    .from(users)
    .where(and(eq(users.canSign, true), ne(users.id, authUser.id)));

  return NextResponse.json({ signers });
}
