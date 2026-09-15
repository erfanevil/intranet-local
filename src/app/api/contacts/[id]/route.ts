import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contacts, contactGroupMembers } from "@/db/schema";
import { getAuthFromRequest } from "@/lib/server-auth";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { name, phone, position, organization, notes, groupIds } = body;

    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (phone) {
      let formattedPhone = phone.replace(/\s/g, "");
      if (formattedPhone.startsWith("+98")) {
        formattedPhone = "0" + formattedPhone.substring(3);
      } else if (!formattedPhone.startsWith("0")) {
        formattedPhone = "0" + formattedPhone;
      }
      updateData.phone = formattedPhone;
    }
    if (position !== undefined) updateData.position = position || null;
    if (organization !== undefined) updateData.organization = organization || null;
    if (notes !== undefined) updateData.notes = notes || null;

    await db.update(contacts).set(updateData).where(eq(contacts.id, Number(id)));

    // Update groups if specified
    if (groupIds !== undefined && Array.isArray(groupIds)) {
      // Remove existing group memberships
      await db.delete(contactGroupMembers).where(eq(contactGroupMembers.contactId, Number(id)));
      
      // Add new group memberships
      if (groupIds.length > 0) {
        await db.insert(contactGroupMembers).values(
          groupIds.map((groupId: number) => ({
            contactId: Number(id),
            groupId,
          }))
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update contact error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await db.delete(contacts).where(eq(contacts.id, Number(id)));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete contact error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
