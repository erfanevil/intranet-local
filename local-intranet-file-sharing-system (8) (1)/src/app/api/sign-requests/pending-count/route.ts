import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { signatureRequests } from "@/db/schema";
import { getAuthFromRequest } from "@/lib/server-auth";
import { eq, and, count } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authUser = await getAuthFromRequest(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [result] = await db
    .select({ count: count() })
    .from(signatureRequests)
    .where(and(eq(signatureRequests.signerId, authUser.id), eq(signatureRequests.status, "pending")));

  return NextResponse.json({ count: result.count });
}
