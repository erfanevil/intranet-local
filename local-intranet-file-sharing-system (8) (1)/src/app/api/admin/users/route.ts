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

export async function GET(request: NextRequest) {
  const authUser = await getAuthFromRequest(request);
  if (!authUser || !authUser.isAdmin) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const allUsers = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      position: users.position,
      phone: users.phone,
      avatar: users.avatar,
      signature: users.signature,
      canSign: users.canSign,
      isAdmin: users.isAdmin,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(users.createdAt);

  return NextResponse.json({ users: allUsers });
}

export async function POST(request: NextRequest) {
  const authUser = await getAuthFromRequest(request);
  if (!authUser || !authUser.isAdmin) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const username = formData.get("username") as string;
    const displayName = formData.get("displayName") as string;
    const position = formData.get("position") as string;
    const password = formData.get("password") as string;
    const phone = formData.get("phone") as string;
    const isAdmin = formData.get("isAdmin") === "true";
    const canSign = formData.get("canSign") === "true";
    const avatarFile = formData.get("avatar") as File | null;
    const sigFile = formData.get("signature") as File | null;

    if (!username || !displayName || !password) {
      return NextResponse.json({ error: "نام کاربری، نام و رمز عبور الزامی است" }, { status: 400 });
    }

    const [existing] = await db.select().from(users).where(eq(users.username, String(username).trim().toLowerCase())).limit(1);
    if (existing) {
      return NextResponse.json({ error: "این نام کاربری قبلاً ثبت شده" }, { status: 409 });
    }

    let avatarFilename = null;
    if (avatarFile && avatarFile.size > 0) {
      await mkdir(AVATAR_DIR, { recursive: true });
      const ext = path.extname(avatarFile.name) || ".jpg";
      avatarFilename = `${crypto.randomUUID()}${ext}`;
      await writeFile(path.join(AVATAR_DIR, avatarFilename), Buffer.from(await avatarFile.arrayBuffer()));
    }

    let sigFilename = null;
    if (sigFile && sigFile.size > 0) {
      await mkdir(SIG_DIR, { recursive: true });
      const ext = path.extname(sigFile.name) || ".png";
      sigFilename = `sig_${crypto.randomUUID()}${ext}`;
      await writeFile(path.join(SIG_DIR, sigFilename), Buffer.from(await sigFile.arrayBuffer()));
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [newUser] = await db.insert(users).values({
      username: String(username).trim().toLowerCase(),
      displayName, position: position || "کارمند",
      phone: phone || null,
      avatar: avatarFilename, signature: sigFilename,
      canSign, password: hashedPassword, isAdmin,
    }).returning();

    return NextResponse.json({ success: true, user: { id: newUser.id, username: newUser.username, displayName: newUser.displayName } });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
