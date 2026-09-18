import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { chats } from "@/db/schema";
import { getAuthFromRequest } from "@/lib/server-auth";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Delete a chat message
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const messageId = Number(id);

  // Only allow deleting own messages
  const [message] = await db
    .select()
    .from(chats)
    .where(and(eq(chats.id, messageId), eq(chats.senderId, authUser.id)))
    .limit(1);

  if (!message) {
    return NextResponse.json({ error: "پیام یافت نشد یا شما اجازه حذف آن را ندارید" }, { status: 404 });
  }

  await db.delete(chats).where(eq(chats.id, messageId));

  return NextResponse.json({ success: true });
}

// Edit a chat message
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const messageId = Number(id);

  try {
    const body = await request.json();
    const { message } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: "متن پیام الزامی است" }, { status: 400 });
    }

    // Only allow editing own messages
    const [existingMessage] = await db
      .select()
      .from(chats)
      .where(and(eq(chats.id, messageId), eq(chats.senderId, authUser.id)))
      .limit(1);

    if (!existingMessage) {
      return NextResponse.json({ error: "پیام یافت نشد یا شما اجازه ویرایش آن را ندارید" }, { status: 404 });
    }

    await db
      .update(chats)
      .set({ message: message.trim() })
      .where(eq(chats.id, messageId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Edit message error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
