import { maskMobile } from "@/lib/auth/phone";

export type SmsDelivery = "sent" | "not_configured" | "failed";

export interface SmsResult {
  delivery: SmsDelivery;
  provider: string | null;
}

/**
 * SMS gateway abstraction.
 *
 * No provider is wired up yet, and delivery is intentionally NOT faked:
 * when credentials are missing we return `not_configured` so callers can be
 * honest with the user instead of pretending an SMS was sent.
 *
 * To go live, set SMS_PROVIDER / SMS_API_KEY / SMS_SENDER and implement the
 * matching branch below (Kavenegar, SMS.ir, Ghasedak, …).
 */
export async function sendSms(phone: string, message: string): Promise<SmsResult> {
  const provider = process.env.SMS_PROVIDER?.trim();
  const apiKey = process.env.SMS_API_KEY?.trim();

  if (!provider || !apiKey) {
    console.warn(
      `[sms] provider not configured — no SMS sent to ${maskMobile(phone)}. Message: ${message}`,
    );
    return { delivery: "not_configured", provider: null };
  }

  try {
    switch (provider) {
      // case "kavenegar": {
      //   const url = `https://api.kavenegar.com/v1/${apiKey}/sms/send.json`;
      //   const res = await fetch(url, {
      //     method: "POST",
      //     headers: { "Content-Type": "application/x-www-form-urlencoded" },
      //     body: new URLSearchParams({
      //       receptor: phone,
      //       sender: process.env.SMS_SENDER ?? "",
      //       message,
      //     }),
      //   });
      //   if (!res.ok) throw new Error(`kavenegar responded ${res.status}`);
      //   return { delivery: "sent", provider };
      // }
      default:
        console.error(`[sms] unknown provider "${provider}" — message not sent.`);
        return { delivery: "failed", provider };
    }
  } catch (error) {
    console.error("[sms] delivery failed", error);
    return { delivery: "failed", provider };
  }
}

/** True when OTP codes may be surfaced in API responses for local testing. */
export function devOtpEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" || process.env.AUTH_DEV_SHOW_OTP === "true"
  );
}

export function otpMessage(code: string): string {
  return `سفارشچی\nکد تأیید شما: ${code}\nاین کد تا ۵ دقیقه معتبر است.`;
}
