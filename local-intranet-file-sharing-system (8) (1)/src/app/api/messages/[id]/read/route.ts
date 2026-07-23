import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { getAuthFromRequest } from "@/lib/server-auth";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  await db
    .update(messages)
    .set({ isRead: true })
    .where(
      and(
        eq(messages.id, Number(id)),
        eq(messages.receiverId, authUser.id)
      )
    );

  return NextResponse.json({ success: true });
}
