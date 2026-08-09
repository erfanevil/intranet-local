import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contactGroups, contactGroupMembers } from "@/db/schema";
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
    const { name, description, color } = body;

    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description || null;
    if (color) updateData.color = color;

    await db.update(contactGroups).set(updateData).where(eq(contactGroups.id, Number(id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update group error:", error);
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
    await db.delete(contactGroups).where(eq(contactGroups.id, Number(id)));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete group error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
