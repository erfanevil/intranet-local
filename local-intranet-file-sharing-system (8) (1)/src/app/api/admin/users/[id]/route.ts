import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getAuthFromRequest } from "@/lib/server-auth";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

const AVATAR_DIR = path.join(process.cwd(), "uploads", "avatars");
const SIG_DIR = path.join(process.cwd(), "uploads", "signatures");

export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthFromRequest(request);
  if (!authUser || !authUser.isAdmin) return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  const { id } = await params;
  if (Number(id) === authUser.id) return NextResponse.json({ error: "نمی‌توانید خودتان را حذف کنید" }, { status: 400 });
  await db.delete(users).where(eq(users.id, Number(id)));
  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthFromRequest(request);
  if (!authUser || !authUser.isAdmin) return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  const { id } = await params;

  try {
    const formData = await request.formData();
    const displayName = formData.get("displayName") as string;
    const position = formData.get("position") as string;
    const password = formData.get("password") as string;
    const phone = formData.get("phone") as string;
    const isAdmin = formData.get("isAdmin") === "true";
    const canSign = formData.get("canSign") === "true";
    const avatarFile = formData.get("avatar") as File | null;
    const sigFile = formData.get("signature") as File | null;

    const updateData: Record<string, unknown> = {};
    if (displayName) updateData.displayName = displayName;
    if (position) updateData.position = position;
    if (phone !== null && phone !== undefined) updateData.phone = phone || null;
    updateData.isAdmin = isAdmin;
    updateData.canSign = canSign;
    if (password) updateData.password = await bcrypt.hash(password, 10);

    if (avatarFile && avatarFile.size > 0) {
      await mkdir(AVATAR_DIR, { recursive: true });
      const ext = path.extname(avatarFile.name) || ".jpg";
      const fn = `${crypto.randomUUID()}${ext}`;
      await writeFile(path.join(AVATAR_DIR, fn), Buffer.from(await avatarFile.arrayBuffer()));
      updateData.avatar = fn;
    }

    if (sigFile && sigFile.size > 0) {
      await mkdir(SIG_DIR, { recursive: true });
      const ext = path.extname(sigFile.name) || ".png";
      const fn = `sig_${crypto.randomUUID()}${ext}`;
      await writeFile(path.join(SIG_DIR, fn), Buffer.from(await sigFile.arrayBuffer()));
      updateData.signature = fn;
    }

    await db.update(users).set(updateData).where(eq(users.id, Number(id)));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
