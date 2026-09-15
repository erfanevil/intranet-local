import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  apiError,
  apiOk,
  clientIp,
  normalizeOtpInput,
  readJson,
  readString,
} from "@/lib/auth/api";
import { normalizeIranMobile, maskMobile } from "@/lib/auth/phone";
import { issueOtp, issueVerificationToken, verifyOtp, type OtpPurpose } from "@/lib/auth/otp";
import {
  OTP_RESEND_COOLDOWN_SEC,
  OTP_TTL_SEC,
  RULES,
  checkRate,
  cooldownRemaining,
  recordAttempt,
} from "@/lib/auth/rate-limit";
import { devOtpEnabled, otpMessage, sendSms } from "@/lib/sms";
import { toFaDigits } from "@/lib/format";

async function phoneExists(phone: string): Promise<boolean> {
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.phone, phone))
    .limit(1);
  return Boolean(row);
}

/** Shared implementation of POST /api/auth/{register,forgot-password}/request-otp */
export async function handleRequestOtp(request: Request, purpose: OtpPurpose) {
  const body = await readJson(request);
  const phone = normalizeIranMobile(readString(body, "phone"));

  if (!phone) {
    return apiError(422, "invalid_phone", "شماره موبایل معتبر نیست.", {
      fields: { phone: "شماره موبایل را به شکل ۰۹۱۲۳۴۵۶۷۸۹ وارد کنید." },
    });
  }

  const exists = await phoneExists(phone);

  if (purpose === "register" && exists) {
    return apiError(
      409,
      "phone_taken",
      "این شماره قبلاً ثبت‌نام کرده است. وارد شوید یا رمز عبور را بازیابی کنید.",
      { fields: { phone: "این شماره قبلاً ثبت‌نام کرده است." } },
    );
  }

  if (purpose === "reset" && !exists) {
    return apiError(404, "user_not_found", "حسابی با این شماره پیدا نشد.", {
      fields: { phone: "حسابی با این شماره ثبت نشده است." },
    });
  }

  const ip = clientIp(request);
  const phoneBucket = `otp:${purpose}:${phone}`;
  const ipBucket = `otp-ip:${ip}`;

  // Back-to-back protection: hard cooldown between two codes.
  const cooldown = await cooldownRemaining(phoneBucket, OTP_RESEND_COOLDOWN_SEC);
  if (cooldown > 0) {
    return apiError(429, "cooldown", `تا ${toFaDigits(cooldown)} ثانیه دیگر امکان ارسال مجدد نیست.`, {
      retryAfterSec: cooldown,
    });
  }

  const perPhone = await checkRate(phoneBucket, RULES.otpPerPhoneHourly);
  if (!perPhone.ok) {
    return apiError(
      429,
      "rate_limited",
      "تعداد درخواست کد تأیید بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.",
      { retryAfterSec: perPhone.retryAfterSec },
    );
  }

  const perIp = await checkRate(ipBucket, RULES.otpPerIpHourly);
  if (!perIp.ok) {
    return apiError(429, "rate_limited", "درخواست‌های شما بیش از حد مجاز است.", {
      retryAfterSec: perIp.retryAfterSec,
    });
  }

  const { code } = await issueOtp(phone, purpose);
  await recordAttempt(phoneBucket);
  await recordAttempt(ipBucket);

  const sms = await sendSms(phone, otpMessage(code));

  return apiOk({
    phone,
    maskedPhone: maskMobile(phone),
    expiresInSec: OTP_TTL_SEC,
    resendAfterSec: OTP_RESEND_COOLDOWN_SEC,
    codeLength: 6,
    delivery: sms.delivery,
    // Real SMS is never faked: when no gateway is configured the code is
    // surfaced here (dev only) so the flow remains testable end-to-end.
    ...(sms.delivery !== "sent" && devOtpEnabled() ? { devCode: code } : {}),
  });
}

/** Shared implementation of POST /api/auth/{register,forgot-password}/verify-otp */
export async function handleVerifyOtp(request: Request, purpose: OtpPurpose) {
  const body = await readJson(request);
  const phone = normalizeIranMobile(readString(body, "phone"));
  const code = normalizeOtpInput(readString(body, "code"));

  if (!phone) {
    return apiError(422, "invalid_phone", "شماره موبایل معتبر نیست.");
  }
  if (code.length < 5 || code.length > 6) {
    return apiError(422, "invalid_code", "کد تأیید باید ۵ یا ۶ رقم باشد.", {
      fields: { code: "کد تأیید را کامل وارد کنید." },
    });
  }

  const verifyBucket = `otp-verify:${purpose}:${phone}`;
  const guard = await checkRate(verifyBucket, RULES.otpVerifyPerPhone);
  if (!guard.ok) {
    return apiError(429, "rate_limited", "تلاش‌های ناموفق زیاد بود. کمی بعد دوباره تلاش کنید.", {
      retryAfterSec: guard.retryAfterSec,
    });
  }

  const result = await verifyOtp(phone, purpose, code);

  if (!result.ok) {
    await recordAttempt(verifyBucket);
    const messages: Record<string, string> = {
      not_found: "کد فعالی برای این شماره وجود ندارد. دوباره کد بگیرید.",
      expired: "کد تأیید منقضی شده است. کد جدید دریافت کنید.",
      too_many_attempts: "تعداد تلاش‌های نادرست زیاد بود. کد جدید دریافت کنید.",
      mismatch: "کد تأیید نادرست است.",
    };
    return apiError(400, result.reason, messages[result.reason] ?? "کد تأیید نامعتبر است.", {
      fields: { code: messages[result.reason] ?? "کد تأیید نامعتبر است." },
    });
  }

  const { token, expiresAt } = await issueVerificationToken(phone, purpose);

  return apiOk({
    phone,
    verificationToken: token,
    expiresAt: expiresAt.toISOString(),
  });
}
