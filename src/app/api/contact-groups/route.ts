import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contactGroups, contactGroupMembers, contacts } from "@/db/schema";
import { getAuthFromRequest } from "@/lib/server-auth";
import { eq, desc, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authUser = await getAuthFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get all groups with member count
  const groups = await db
    .select({
      id: contactGroups.id,
      name: contactGroups.name,
      description: contactGroups.description,
      color: contactGroups.color,
      createdAt: contactGroups.createdAt,
    })
    .from(contactGroups)
    .orderBy(desc(contactGroups.createdAt));

  // Get member count for each group
  const groupsWithCount = await Promise.all(
    groups.map(async (group) => {
      const [result] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(contactGroupMembers)
        .where(eq(contactGroupMembers.groupId, group.id));
      
      return { ...group, memberCount: result?.count || 0 };
    })
  );

  return NextResponse.json({ groups: groupsWithCount });
}

export async function POST(request: NextRequest) {
  const authUser = await getAuthFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, description, color } = body;

    if (!name) {
      return NextResponse.json({ error: "نام گروه الزامی است" }, { status: 400 });
    }

    const [newGroup] = await db
      .insert(contactGroups)
      .values({
        name,
        description: description || null,
        color: color || "#3b82f6",
        createdById: authUser.id,
      })
      .returning();

    return NextResponse.json({ success: true, group: newGroup });
  } catch (error) {
    console.error("Create group error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
