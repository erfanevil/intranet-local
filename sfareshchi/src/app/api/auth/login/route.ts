import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { apiError, apiOk, clientIp, readJson, readString } from "@/lib/auth/api";
import { verifyPassword } from "@/lib/auth/crypto";
import { normalizeIranMobile } from "@/lib/auth/phone";
import { RULES, checkRate, recordAttempt, resetBucket } from "@/lib/auth/rate-limit";
import { toFaDigits } from "@/lib/format";
import { createSession } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await readJson(request);
  const phone = normalizeIranMobile(readString(body, "phone"));
  const password = readString(body, "password");

  if (!phone || !password) {
    return apiError(422, "validation_error", "شماره موبایل و رمز عبور را وارد کنید.", {
      fields: {
        ...(phone ? {} : { phone: "شماره موبایل معتبر نیست." }),
        ...(password ? {} : { password: "رمز عبور را وارد کنید." }),
      },
    });
  }

  const ip = clientIp(request);
  const phoneBucket = `login:${phone}`;
  const ipBucket = `login-ip:${ip}`;

  const perPhone = await checkRate(phoneBucket, RULES.loginPerPhone);
  if (!perPhone.ok) {
    return apiError(
      429,
      "rate_limited",
      `تلاش‌های ناموفق زیاد بود. ${toFaDigits(perPhone.retryAfterSec)} ثانیه دیگر دوباره تلاش کنید.`,
      { retryAfterSec: perPhone.retryAfterSec },
    );
  }

  const perIp = await checkRate(ipBucket, RULES.loginPerIp);
  if (!perIp.ok) {
    return apiError(429, "rate_limited", "تلاش‌های ناموفق زیاد بود. کمی بعد دوباره تلاش کنید.", {
      retryAfterSec: perIp.retryAfterSec,
    });
  }

  const [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);

  // Same generic message for unknown phone and wrong password (no enumeration).
  const invalid = () =>
    apiError(401, "invalid_credentials", "شماره موبایل یا رمز عبور نادرست است.");

  if (!user) {
    await recordAttempt(phoneBucket);
    await recordAttempt(ipBucket);
    return invalid();
  }

  const passwordOk = await verifyPassword(password, user.passwordHash);
  if (!passwordOk) {
    await recordAttempt(phoneBucket);
    await recordAttempt(ipBucket);
    return invalid();
  }

  await resetBucket(phoneBucket);
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  await createSession(user);

  return apiOk({
    user: {
      id: user.id,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      storeName: user.storeName,
    },
    redirectTo: "/dashboard",
  });
}
