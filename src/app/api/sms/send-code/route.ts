import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getAuthFromRequest } from "@/lib/server-auth";
import { eq } from "drizzle-orm";

const KAVENEGAR_API_KEY = "47464F4B4B5256544231364A6E544B6C5447565667436D644D5A6631677377504E73576855316C533951733D";
const SENDER = "100009235";

// Store codes in memory (in production, use Redis or database)
const codes = new Map<number, { code: string; expires: number }>();

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authUser = await getAuthFromRequest(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { signRequestId } = await request.json();
    if (!signRequestId) return NextResponse.json({ error: "شناسه درخواست الزامی است" }, { status: 400 });

    // Get user phone
    const [user] = await db.select({ phone: users.phone }).from(users).where(eq(users.id, authUser.id)).limit(1);

    if (!user?.phone) {
      return NextResponse.json({ error: "شماره موبایل ثبت نشده. با ادمین تماس بگیرید." }, { status: 400 });
    }

    // Generate 5-digit code
    const code = String(Math.floor(10000 + Math.random() * 90000));

    // Store code (expires in 3 minutes)
    codes.set(authUser.id, { code, expires: Date.now() + 3 * 60 * 1000 });

    // Format phone - remove leading 0 for Kavenegar
    let receptor = user.phone.replace(/\s/g, "").replace(/-/g, "");
    if (receptor.startsWith("+98")) {
      receptor = receptor.substring(3);
    } else if (receptor.startsWith("0")) {
      receptor = receptor.substring(1);
    }
    
    const message = `کد تأیید امضا: ${code}\nشهرداری لاهیجان`;

    // Send SMS via Kavenegar (POST method)
    const url = `https://api.kavenegar.com/v1/${KAVENEGAR_API_KEY}/sms/send.json`;

    const formBody = new URLSearchParams();
    formBody.append("receptor", receptor);
    formBody.append("sender", SENDER);
    formBody.append("message", message);

    console.log("[SMS] Sending to:", receptor, "from:", SENDER);

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    try {
      const smsRes = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formBody.toString(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const smsData = await smsRes.json();
      console.log("[SMS] Kavenegar response:", JSON.stringify(smsData));

      if (smsData.return?.status !== 200) {
        const errorMsg = smsData.return?.message || "خطای نامشخص";
        console.error("[SMS] Kavenegar error:", errorMsg, "Status:", smsData.return?.status);
        
        // Provide more helpful error messages
        let userMessage = `خطا در ارسال پیامک: ${errorMsg}`;
        if (smsData.return?.status === 418) {
          userMessage = "شماره موبایل نامعتبر است. لطفاً شماره صحیح ثبت کنید.";
        } else if (smsData.return?.status === 424) {
          userMessage = "خط ارسال پیامک مشکل دارد. با پشتیبانی تماس بگیرید.";
        } else if (smsData.return?.status === 411) {
          userMessage = "API Key کاوه‌نگار نامعتبر است.";
        }
        
        return NextResponse.json({ error: userMessage }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: "کد تأیید ارسال شد" });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        console.error("[SMS] Request timeout");
        return NextResponse.json({ 
          error: "اتصال به سرور کاوه‌نگار طول کشید. اینترنت سرور را بررسی کنید." 
        }, { status: 500 });
      }
      throw fetchError;
    }
  } catch (error) {
    console.error("[SMS] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "خطای نامشخص";
    return NextResponse.json({ 
      error: `خطا در ارسال پیامک: ${errorMessage}` 
    }, { status: 500 });
  }
}

export { codes };
