import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  apiError,
  apiOk,
  readJson,
  readString,
  validateName,
  validatePassword,
} from "@/lib/auth/api";
import { hashPassword } from "@/lib/auth/crypto";
import { findValidVerificationToken, markVerificationTokenUsed } from "@/lib/auth/otp";
import { normalizeIranMobile } from "@/lib/auth/phone";
import { createSession } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await readJson(request);

  const phone = normalizeIranMobile(readString(body, "phone"));
  const verificationToken = readString(body, "verificationToken");
  const firstName = readString(body, "firstName");
  const lastName = readString(body, "lastName");
  const storeName = readString(body, "storeName");
  const password = readString(body, "password");
  const confirmPassword = readString(body, "confirmPassword");

  if (!phone) {
    return apiError(422, "invalid_phone", "شماره موبایل معتبر نیست.");
  }

  const fields: Record<string, string> = {};

  const firstNameError = validateName(firstName, "نام");
  if (firstNameError) fields.firstName = firstNameError;

  const lastNameError = validateName(lastName, "نام خانوادگی");
  if (lastNameError) fields.lastName = lastNameError;

  const storeNameError = validateName(storeName, "نام فروشگاه");
  if (storeNameError) fields.storeName = storeNameError;

  const passwordError = validatePassword(password);
  if (passwordError) fields.password = passwordError;

  if (password !== confirmPassword) {
    fields.confirmPassword = "تکرار رمز عبور با رمز عبور یکسان نیست.";
  }

  if (Object.keys(fields).length > 0) {
    return apiError(422, "validation_error", "لطفاً خطاهای فرم را برطرف کنید.", { fields });
  }

  // Registration only continues when the phone actually passed OTP verification.
  // Validated but not consumed yet, so a later failure keeps the user verified.
  const tokenId = await findValidVerificationToken(phone, "register", verificationToken);
  if (tokenId === null) {
    return apiError(
      401,
      "verification_required",
      "تأیید شماره موبایل منقضی شده است. لطفاً دوباره کد تأیید بگیرید.",
    );
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.phone, phone))
    .limit(1);

  if (existing) {
    return apiError(409, "phone_taken", "این شماره قبلاً ثبت‌نام کرده است.");
  }

  const passwordHash = await hashPassword(password);

  // All checks passed — the token is spent exactly once.
  await markVerificationTokenUsed(tokenId);

  const [user] = await db
    .insert(users)
    .values({
      phone,
      firstName,
      lastName,
      storeName,
      passwordHash,
      phoneVerifiedAt: new Date(),
      lastLoginAt: new Date(),
    })
    .returning();

  await createSession(user);

  return apiOk(
    {
      user: {
        id: user.id,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        storeName: user.storeName,
      },
      redirectTo: "/dashboard",
    },
    201,
  );
}
