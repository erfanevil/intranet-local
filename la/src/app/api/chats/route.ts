import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { chats, users } from "@/db/schema";
import { getAuthFromRequest } from "@/lib/server-auth";
import { eq, or, and, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authUser = await getAuthFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const otherUserId = url.searchParams.get("userId");

  if (!otherUserId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const chatMessages = await db
    .select({
      id: chats.id,
      message: chats.message,
      senderId: chats.senderId,
      receiverId: chats.receiverId,
      isRead: chats.isRead,
      createdAt: chats.createdAt,
    })
    .from(chats)
    .where(
      or(
        and(
          eq(chats.senderId, authUser.id),
          eq(chats.receiverId, Number(otherUserId))
        ),
        and(
          eq(chats.senderId, Number(otherUserId)),
          eq(chats.receiverId, authUser.id)
        )
      )
    )
    .orderBy(chats.createdAt);

  // Mark received messages as read
  await db
    .update(chats)
    .set({ isRead: true })
    .where(
      and(
        eq(chats.senderId, Number(otherUserId)),
        eq(chats.receiverId, authUser.id)
      )
    );

  return NextResponse.json({ chats: chatMessages });
}

export async function POST(request: NextRequest) {
  const authUser = await getAuthFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { message, receiverId } = await request.json();

    if (!message || !receiverId) {
      return NextResponse.json({ error: "پیام و گیرنده الزامی است" }, { status: 400 });
    }

    const [newChat] = await db
      .insert(chats)
      .values({
        message,
        senderId: authUser.id,
        receiverId: Number(receiverId),
      })
      .returning();

    return NextResponse.json({ success: true, chat: newChat });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
