import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { files } from "@/db/schema";
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
  const fileId = Number(id);

  const [file] = await db.select().from(files).where(eq(files.id, fileId)).limit(1);
  if (!file) return NextResponse.json({ error: "یافت نشد" }, { status: 404 });

  if (file.receiverId === authUser.id) {
    await db.update(files).set({ receiverArchived: false }).where(eq(files.id, fileId));
  }
  if (file.senderId === authUser.id) {
    await db.update(files).set({ senderArchived: false }).where(eq(files.id, fileId));
  }

  return NextResponse.json({ success: true });
}
