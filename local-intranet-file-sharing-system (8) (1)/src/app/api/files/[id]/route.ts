import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { files } from "@/db/schema";
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

  const [file] = await db
    .select()
    .from(files)
    .where(
      and(
        eq(files.id, Number(id)),
        or(
          eq(files.receiverId, authUser.id),
          eq(files.senderId, authUser.id)
        )
      )
    )
    .limit(1);

  if (!file) {
    return NextResponse.json({ error: "فایل یافت نشد" }, { status: 404 });
  }

  if (file.receiverId === authUser.id) {
    await db.update(files).set({ receiverArchived: true }).where(eq(files.id, file.id));
  }

  if (file.senderId === authUser.id) {
    await db.update(files).set({ senderArchived: true }).where(eq(files.id, file.id));
  }

  return NextResponse.json({ success: true, archived: true });
}
