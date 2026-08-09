import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getAuthFromRequest } from "@/lib/server-auth";
import { eq } from "drizzle-orm";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

const SIG_DIR = path.join(process.cwd(), "uploads", "signatures");

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthFromRequest(request);
  if (!authUser || !authUser.isAdmin) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const { id } = await params;
  const userId = Number(id);

  try {
    const formData = await request.formData();
    const file = formData.get("signature") as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "فایل امضا الزامی است" }, { status: 400 });
    }

    await mkdir(SIG_DIR, { recursive: true });

    const ext = path.extname(file.name) || ".png";
    const filename = `sig_${crypto.randomUUID()}${ext}`;
    const arrayBuffer = await file.arrayBuffer();
    await writeFile(path.join(SIG_DIR, filename), Buffer.from(arrayBuffer));

    await db.update(users).set({ signature: filename }).where(eq(users.id, userId));

    return NextResponse.json({ success: true, signature: filename });
  } catch (error) {
    console.error("Signature upload error:", error);
    return NextResponse.json({ error: "خطای آپلود امضا" }, { status: 500 });
  }
}
