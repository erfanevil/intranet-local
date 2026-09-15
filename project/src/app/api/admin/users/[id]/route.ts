import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  users,
  files,
  messages,
  messageAttachments,
  chats,
  signatureRequests,
  contactGroups,
  contacts,
  contactGroupMembers,
  smsCampaigns,
  smsLogs,
} from "@/db/schema";
import { getAuthFromRequest } from "@/lib/server-auth";
import { eq, or, inArray } from "drizzle-orm";
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
  if (!authUser || !authUser.isAdmin)
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });

  const { id } = await params;
  const userId = Number(id);

  if (userId === authUser.id)
    return NextResponse.json(
      { error: "نمی‌توانید خودتان را حذف کنید" },
      { status: 400 }
    );

  try {
    // 1. Delete message attachments for messages sent/received by this user
    const userMessages = await db
      .select({ id: messages.id })
      .from(messages)
      .where(or(eq(messages.senderId, userId), eq(messages.receiverId, userId)));

    if (userMessages.length > 0) {
      const msgIds = userMessages.map((m) => m.id);
      await db
        .delete(messageAttachments)
        .where(inArray(messageAttachments.messageId, msgIds));
    }

    // 2. Delete messages
    await db
      .delete(messages)
      .where(or(eq(messages.senderId, userId), eq(messages.receiverId, userId)));

    // 3. Delete chats
    await db
      .delete(chats)
      .where(or(eq(chats.senderId, userId), eq(chats.receiverId, userId)));

    // 4. Delete files
    await db
      .delete(files)
      .where(or(eq(files.senderId, userId), eq(files.receiverId, userId)));

    // 5. Delete signature requests
    await db
      .delete(signatureRequests)
      .where(
        or(
          eq(signatureRequests.senderId, userId),
          eq(signatureRequests.signerId, userId)
        )
      );

    // 6. SMS logs for campaigns by this user
    const userCampaigns = await db
      .select({ id: smsCampaigns.id })
      .from(smsCampaigns)
      .where(eq(smsCampaigns.senderId, userId));

    if (userCampaigns.length > 0) {
      const campIds = userCampaigns.map((c) => c.id);
      await db.delete(smsLogs).where(inArray(smsLogs.campaignId, campIds));
    }

    // 7. SMS campaigns
    await db.delete(smsCampaigns).where(eq(smsCampaigns.senderId, userId));

    // 8. Contacts created by this user – first remove group memberships
    const userContacts = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(eq(contacts.createdById, userId));

    if (userContacts.length > 0) {
      const contactIds = userContacts.map((c) => c.id);
      await db
        .delete(contactGroupMembers)
        .where(inArray(contactGroupMembers.contactId, contactIds));
      // Also clean smsLogs referencing these contacts
      await db
        .delete(smsLogs)
        .where(inArray(smsLogs.contactId, contactIds));
    }

    await db.delete(contacts).where(eq(contacts.createdById, userId));

    // 9. Contact groups created by this user – first remove memberships
    const userGroups = await db
      .select({ id: contactGroups.id })
      .from(contactGroups)
      .where(eq(contactGroups.createdById, userId));

    if (userGroups.length > 0) {
      const groupIds = userGroups.map((g) => g.id);
      await db
        .delete(contactGroupMembers)
        .where(inArray(contactGroupMembers.groupId, groupIds));
    }

    await db.delete(contactGroups).where(eq(contactGroups.createdById, userId));

    // 10. Finally delete the user
    await db.delete(users).where(eq(users.id, userId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json(
      { error: "خطا در حذف کاربر. لطفاً دوباره تلاش کنید." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthFromRequest(request);
  if (!authUser || !authUser.isAdmin)
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  const { id } = await params;

  try {
    const formData = await request.formData();
    const displayName = formData.get("displayName") as string;
    const position = formData.get("position") as string;
    const password = formData.get("password") as string;
    const phone = formData.get("phone") as string;
    const isAdmin = formData.get("isAdmin") === "true";
    const canSign = formData.get("canSign") === "true";
    const canNotify = formData.get("canNotify") === "true";
    const avatarFile = formData.get("avatar") as File | null;
    const sigFile = formData.get("signature") as File | null;

    const updateData: Record<string, unknown> = {};
    if (displayName) updateData.displayName = displayName;
    if (position) updateData.position = position;
    if (phone !== null && phone !== undefined) updateData.phone = phone || null;
    updateData.isAdmin = isAdmin;
    updateData.canSign = canSign;
    updateData.canNotify = canNotify;
    if (password) updateData.password = await bcrypt.hash(password, 10);

    if (avatarFile && avatarFile.size > 0) {
      await mkdir(AVATAR_DIR, { recursive: true });
      const ext = path.extname(avatarFile.name) || ".jpg";
      const fn = `${crypto.randomUUID()}${ext}`;
      await writeFile(
        path.join(AVATAR_DIR, fn),
        Buffer.from(await avatarFile.arrayBuffer())
      );
      updateData.avatar = fn;
    }

    if (sigFile && sigFile.size > 0) {
      await mkdir(SIG_DIR, { recursive: true });
      const ext = path.extname(sigFile.name) || ".png";
      const fn = `sig_${crypto.randomUUID()}${ext}`;
      await writeFile(
        path.join(SIG_DIR, fn),
        Buffer.from(await sigFile.arrayBuffer())
      );
      updateData.signature = fn;
    }

    await db.update(users).set(updateData).where(eq(users.id, Number(id)));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
