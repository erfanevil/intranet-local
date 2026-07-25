import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    
    if (!token) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const tokenUser = await verifyToken(token);
    
    if (!tokenUser) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    // Get fresh data from database (includes avatar)
    const [dbUser] = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        position: users.position,
        avatar: users.avatar,
        isAdmin: users.isAdmin,
      })
      .from(users)
      .where(eq(users.id, tokenUser.id))
      .limit(1);

    if (!dbUser) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({ user: dbUser });
  } catch (error) {
    console.error("Auth me error:", error);
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
