import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contacts, contactGroupMembers, contactGroups } from "@/db/schema";
import { getAuthFromRequest } from "@/lib/server-auth";
import { eq, desc, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authUser = await getAuthFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const groupId = url.searchParams.get("groupId");

  let contactsList;
  
  if (groupId) {
    // Get contacts in a specific group
    contactsList = await db
      .select({
        id: contacts.id,
        name: contacts.name,
        phone: contacts.phone,
        position: contacts.position,
        organization: contacts.organization,
        notes: contacts.notes,
        createdAt: contacts.createdAt,
      })
      .from(contacts)
      .innerJoin(contactGroupMembers, eq(contactGroupMembers.contactId, contacts.id))
      .where(eq(contactGroupMembers.groupId, Number(groupId)))
      .orderBy(desc(contacts.createdAt));
  } else {
    // Get all contacts with their groups
    const allContacts = await db
      .select({
        id: contacts.id,
        name: contacts.name,
        phone: contacts.phone,
        position: contacts.position,
        organization: contacts.organization,
        notes: contacts.notes,
        createdAt: contacts.createdAt,
      })
      .from(contacts)
      .orderBy(desc(contacts.createdAt));

    // Get groups for each contact
    const contactsWithGroups = await Promise.all(
      allContacts.map(async (contact) => {
        const groups = await db
          .select({
            id: contactGroups.id,
            name: contactGroups.name,
            color: contactGroups.color,
          })
          .from(contactGroups)
          .innerJoin(contactGroupMembers, eq(contactGroupMembers.groupId, contactGroups.id))
          .where(eq(contactGroupMembers.contactId, contact.id));
        
        return { ...contact, groups };
      })
    );

    contactsList = contactsWithGroups;
  }

  return NextResponse.json({ contacts: contactsList });
}

export async function POST(request: NextRequest) {
  const authUser = await getAuthFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, phone, position, organization, notes, groupIds } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: "نام و شماره تلفن الزامی است" }, { status: 400 });
    }

    // Format phone number
    let formattedPhone = phone.replace(/\s/g, "");
    if (formattedPhone.startsWith("+98")) {
      formattedPhone = "0" + formattedPhone.substring(3);
    } else if (!formattedPhone.startsWith("0")) {
      formattedPhone = "0" + formattedPhone;
    }

    const [newContact] = await db
      .insert(contacts)
      .values({
        name,
        phone: formattedPhone,
        position: position || null,
        organization: organization || null,
        notes: notes || null,
        createdById: authUser.id,
      })
      .returning();

    // Add to groups if specified
    if (groupIds && Array.isArray(groupIds) && groupIds.length > 0) {
      await db.insert(contactGroupMembers).values(
        groupIds.map((groupId: number) => ({
          contactId: newContact.id,
          groupId,
        }))
      );
    }

    return NextResponse.json({ success: true, contact: newContact });
  } catch (error) {
    console.error("Create contact error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
