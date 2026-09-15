import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { signatureRequests } from "@/db/schema";
import { getAuthFromRequest } from "@/lib/server-auth";
import { eq, and, or } from "drizzle-orm";
import { unlink } from "fs/promises";
import path from "path";

const DOC_DIR = path.join(process.cwd(), "uploads", "documents");

export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthFromRequest(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [req] = await db.select().from(signatureRequests)
    .where(and(eq(signatureRequests.id, Number(id)), or(eq(signatureRequests.senderId, authUser.id), eq(signatureRequests.signerId, authUser.id))))
    .limit(1);

  if (!req) return NextResponse.json({ error: "یافت نشد" }, { status: 404 });

  if (req.status === "signed") {
    return NextResponse.json({ error: "امکان حذف سند امضا شده وجود ندارد" }, { status: 403 });
  }

  try { await unlink(path.join(DOC_DIR, req.documentFilename)); } catch {}

  await db.delete(signatureRequests).where(eq(signatureRequests.id, req.id));
  return NextResponse.json({ success: true });
}
