import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { apiError, apiOk, readJson, readString, validatePassword } from "@/lib/auth/api";
import { hashPassword, verifyPassword } from "@/lib/auth/crypto";
import { findValidVerificationToken, markVerificationTokenUsed } from "@/lib/auth/otp";
import { normalizeIranMobile } from "@/lib/auth/phone";
import { resetBucket } from "@/lib/auth/rate-limit";
import { createSession } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await readJson(request);

  const phone = normalizeIranMobile(readString(body, "phone"));
  const verificationToken = readString(body, "verificationToken");
  const password = readString(body, "password");
  const confirmPassword = readString(body, "confirmPassword");

  if (!phone) {
    return apiError(422, "invalid_phone", "شماره موبایل معتبر نیست.");
  }

  const fields: Record<string, string> = {};

  const passwordError = validatePassword(password);
  if (passwordError) fields.password = passwordError;

  if (password !== confirmPassword) {
    fields.confirmPassword = "تکرار رمز عبور با رمز عبور یکسان نیست.";
  }

  if (Object.keys(fields).length > 0) {
    return apiError(422, "validation_error", "لطفاً خطاهای فرم را برطرف کنید.", { fields });
  }

  // Validated but NOT consumed yet: a later rejection must not burn the token.
  const tokenId = await findValidVerificationToken(phone, "reset", verificationToken);
  if (tokenId === null) {
    return apiError(
      401,
      "verification_required",
      "تأیید شماره موبایل منقضی شده است. لطفاً دوباره کد تأیید بگیرید.",
    );
  }

  const [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  if (!user) {
    return apiError(404, "user_not_found", "حسابی با این شماره پیدا نشد.");
  }

  const samePassword = await verifyPassword(password, user.passwordHash);
  if (samePassword) {
    return apiError(422, "validation_error", "رمز جدید نباید با رمز قبلی یکسان باشد.", {
      fields: { password: "رمز جدید نباید با رمز قبلی یکسان باشد." },
    });
  }

  const passwordHash = await hashPassword(password);

  // All checks passed — now the token is spent exactly once.
  await markVerificationTokenUsed(tokenId);

  const [updated] = await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date(), lastLoginAt: new Date() })
    .where(eq(users.id, user.id))
    .returning();

  // A successful reset clears the failed-login lockout.
  await resetBucket(`login:${phone}`);
  await createSession(updated);

  return apiOk({ redirectTo: "/dashboard" });
}
