import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { smsCampaigns, smsLogs, contacts, contactGroupMembers, users } from "@/db/schema";
import { getAuthFromRequest } from "@/lib/server-auth";
import { eq, desc, inArray } from "drizzle-orm";

const KAVENEGAR_API_KEY = "47464F4B4B5256544231364A6E544B6C5447565667436D644D5A6631677377504E73576855316C533951733D";
const SENDER = "100009235";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authUser = await getAuthFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const campaigns = await db
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
    .orderBy(desc(smsCampaigns.createdAt));

  return NextResponse.json({ campaigns });
}

export async function POST(request: NextRequest) {
  const authUser = await getAuthFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, message, contactIds, groupIds, customPhones } = body;

    if (!title || !message) {
      return NextResponse.json({ error: "عنوان و متن پیام الزامی است" }, { status: 400 });
    }

    // Collect all recipients
    const recipientSet = new Map<string, { name: string; contactId?: number }>();

    // Add contacts by ID
    if (contactIds && Array.isArray(contactIds) && contactIds.length > 0) {
      const selectedContacts = await db
        .select({ id: contacts.id, name: contacts.name, phone: contacts.phone })
        .from(contacts)
        .where(inArray(contacts.id, contactIds));
      
      for (const c of selectedContacts) {
        recipientSet.set(c.phone, { name: c.name, contactId: c.id });
      }
    }

    // Add contacts by group
    if (groupIds && Array.isArray(groupIds) && groupIds.length > 0) {
      const groupContacts = await db
        .select({ id: contacts.id, name: contacts.name, phone: contacts.phone })
        .from(contacts)
        .innerJoin(contactGroupMembers, eq(contactGroupMembers.contactId, contacts.id))
        .where(inArray(contactGroupMembers.groupId, groupIds));
      
      for (const c of groupContacts) {
        if (!recipientSet.has(c.phone)) {
          recipientSet.set(c.phone, { name: c.name, contactId: c.id });
        }
      }
    }

    // Add custom phone numbers
    if (customPhones && Array.isArray(customPhones)) {
      for (const phone of customPhones) {
        const formattedPhone = formatPhone(phone);
        if (formattedPhone && !recipientSet.has(formattedPhone)) {
          recipientSet.set(formattedPhone, { name: "شماره دستی" });
        }
      }
    }

    const recipients = Array.from(recipientSet.entries());

    if (recipients.length === 0) {
      return NextResponse.json({ error: "حداقل یک گیرنده انتخاب کنید" }, { status: 400 });
    }

    // Create campaign
    const [campaign] = await db
      .insert(smsCampaigns)
      .values({
        title,
        message,
        senderId: authUser.id,
        totalRecipients: recipients.length,
        status: "sending",
      })
      .returning();

    // Send SMS to each recipient
    let sentCount = 0;
    let failedCount = 0;

    for (const [phone, { name, contactId }] of recipients) {
      const receptor = phone.startsWith("0") ? phone.substring(1) : phone;
      
      try {
        const url = `https://api.kavenegar.com/v1/${KAVENEGAR_API_KEY}/sms/send.json`;
        const fullMessage = title ? `${title}\n${message}` : message;
        const formBody = new URLSearchParams();
        formBody.append("receptor", receptor);
        formBody.append("sender", SENDER);
        formBody.append("message", fullMessage);

        console.log(`[SMS] Sending to ${receptor} from ${SENDER}...`);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const smsRes = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formBody.toString(),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        const smsData = await smsRes.json();
        console.log(`[SMS] Response for ${receptor}:`, JSON.stringify(smsData));

        if (smsData.return?.status === 200) {
          sentCount++;
          await db.insert(smsLogs).values({
            campaignId: campaign.id,
            contactId: contactId || null,
            phone,
            recipientName: name,
            message,
            status: "sent",
            kavenegarMessageId: smsData.entries?.[0]?.messageid?.toString(),
            sentAt: new Date(),
          });
        } else {
          failedCount++;
          const errMsg = smsData.return?.message || "خطای نامشخص";
          console.error(`[SMS] Failed for ${receptor}: ${errMsg}`);
          await db.insert(smsLogs).values({
            campaignId: campaign.id,
            contactId: contactId || null,
            phone,
            recipientName: name,
            message,
            status: "failed",
            errorMessage: errMsg,
          });
        }
      } catch (error) {
        failedCount++;
        const errMsg = error instanceof Error 
          ? (error.name === "AbortError" ? "اتصال به سرور کاوه‌نگار برقرار نشد (Timeout). اینترنت سرور را بررسی کنید." : error.message)
          : "خطای اتصال";
        console.error(`[SMS] Error for ${receptor}: ${errMsg}`);
        await db.insert(smsLogs).values({
          campaignId: campaign.id,
          contactId: contactId || null,
          phone,
          recipientName: name,
          message,
          status: "failed",
          errorMessage: errMsg,
        });
      }
    }

    // Update campaign status
    await db
      .update(smsCampaigns)
      .set({
        sentCount,
        failedCount,
        status: failedCount === recipients.length ? "failed" : "completed",
        sentAt: new Date(),
      })
      .where(eq(smsCampaigns.id, campaign.id));

    return NextResponse.json({
      success: true,
      campaign: {
        ...campaign,
        sentCount,
        failedCount,
        status: failedCount === recipients.length ? "failed" : "completed",
      },
    });
  } catch (error) {
    console.error("Send campaign error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

function formatPhone(phone: string): string | null {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length < 10) return null;
  
  if (cleaned.startsWith("98")) {
    return "0" + cleaned.substring(2);
  } else if (cleaned.startsWith("0")) {
    return cleaned;
  } else if (cleaned.length === 10) {
    return "0" + cleaned;
  }
  return null;
}
