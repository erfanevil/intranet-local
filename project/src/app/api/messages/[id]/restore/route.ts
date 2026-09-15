import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { getAuthFromRequest } from "@/lib/server-auth";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthFromRequest(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const msgId = Number(id);

  const [msg] = await db.select().from(messages).where(eq(messages.id, msgId)).limit(1);
  if (!msg) return NextResponse.json({ error: "یافت نشد" }, { status: 404 });

  if (msg.receiverId === authUser.id) {
    await db.update(messages).set({ receiverArchived: false }).where(eq(messages.id, msgId));
  }
  if (msg.senderId === authUser.id) {
    await db.update(messages).set({ senderArchived: false }).where(eq(messages.id, msgId));
  }

  return NextResponse.json({ success: true });
}
