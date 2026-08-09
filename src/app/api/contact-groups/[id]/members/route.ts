import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contactGroupMembers, contacts } from "@/db/schema";
import { getAuthFromRequest } from "@/lib/server-auth";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const members = await db
    .select({
      id: contacts.id,
      name: contacts.name,
      phone: contacts.phone,
      position: contacts.position,
      organization: contacts.organization,
    })
    .from(contacts)
    .innerJoin(contactGroupMembers, eq(contactGroupMembers.contactId, contacts.id))
    .where(eq(contactGroupMembers.groupId, Number(id)));

  return NextResponse.json({ members });
}

export async function POST(
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
    const { contactIds } = body;

    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json({ error: "لیست مخاطبین الزامی است" }, { status: 400 });
    }

    // Add contacts to group (ignore duplicates)
    for (const contactId of contactIds) {
      try {
        await db.insert(contactGroupMembers).values({
          contactId,
          groupId: Number(id),
        });
      } catch {
        // Ignore duplicate entries
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Add members error:", error);
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
    const body = await request.json();
    const { contactId } = body;

    if (!contactId) {
      return NextResponse.json({ error: "شناسه مخاطب الزامی است" }, { status: 400 });
    }

    await db
      .delete(contactGroupMembers)
      .where(
        eq(contactGroupMembers.groupId, Number(id))
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove member error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
