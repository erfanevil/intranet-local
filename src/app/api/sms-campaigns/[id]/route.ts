import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { smsCampaigns, smsLogs, users } from "@/db/schema";
import { getAuthFromRequest } from "@/lib/server-auth";
import { eq, desc } from "drizzle-orm";

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

  // Get campaign details
  const [campaign] = await db
    .select({
      id: smsCampaigns.id,
      title: smsCampaigns.title,
      message: smsCampaigns.message,
      totalRecipients: smsCampaigns.totalRecipients,
      sentCount: smsCampaigns.sentCount,
      failedCount: smsCampaigns.failedCount,
      status: smsCampaigns.status,
      sentAt: smsCampaigns.sentAt,
      createdAt: smsCampaigns.createdAt,
      senderName: users.displayName,
    })
    .from(smsCampaigns)
    .innerJoin(users, eq(smsCampaigns.senderId, users.id))
    .where(eq(smsCampaigns.id, Number(id)))
    .limit(1);

  if (!campaign) {
    return NextResponse.json({ error: "کمپین یافت نشد" }, { status: 404 });
  }

  // Get logs for this campaign
  const logs = await db
    .select({
      id: smsLogs.id,
      phone: smsLogs.phone,
      recipientName: smsLogs.recipientName,
      status: smsLogs.status,
      errorMessage: smsLogs.errorMessage,
      sentAt: smsLogs.sentAt,
    })
    .from(smsLogs)
    .where(eq(smsLogs.campaignId, Number(id)))
    .orderBy(desc(smsLogs.sentAt));

  return NextResponse.json({ campaign, logs });
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
    await db.delete(smsCampaigns).where(eq(smsCampaigns.id, Number(id)));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete campaign error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
