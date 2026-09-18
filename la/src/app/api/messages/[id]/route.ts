import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { getAuthFromRequest } from "@/lib/server-auth";
import { eq, and, or } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [msg] = await db
    .select()
    .from(messages)
    .where(
      and(
        eq(messages.id, Number(id)),
        or(
          eq(messages.receiverId, authUser.id),
          eq(messages.senderId, authUser.id)
        )
      )
    )
    .limit(1);

  if (!msg) {
    return NextResponse.json({ error: "نامه یافت نشد" }, { status: 404 });
  }

  if (msg.receiverId === authUser.id) {
    await db.update(messages).set({ receiverArchived: true }).where(eq(messages.id, msg.id));
  }

  if (msg.senderId === authUser.id) {
    await db.update(messages).set({ senderArchived: true }).where(eq(messages.id, msg.id));
  }

  return NextResponse.json({ success: true, archived: true });
}
