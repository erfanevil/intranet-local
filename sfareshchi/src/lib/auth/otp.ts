import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { otpCodes, verificationTokens } from "@/db/schema";
import { digest, generateOtpCode, generateToken, safeEqual } from "@/lib/auth/crypto";
import {
  OTP_MAX_ATTEMPTS,
  OTP_TTL_SEC,
  VERIFICATION_TTL_SEC,
} from "@/lib/auth/rate-limit";

export type OtpPurpose = "register" | "reset";

/**
 * Invalidate outstanding codes and issue a fresh one.
 * Only the HMAC digest is stored; the plain code is returned once to be
 * handed to the SMS gateway.
 */
export async function issueOtp(phone: string, purpose: OtpPurpose): Promise<{
  code: string;
  expiresAt: Date;
}> {
  await db
    .update(otpCodes)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(otpCodes.phone, phone),
        eq(otpCodes.purpose, purpose),
        isNull(otpCodes.consumedAt),
      ),
    );

  const code = generateOtpCode(6);
  const expiresAt = new Date(Date.now() + OTP_TTL_SEC * 1000);

  await db.insert(otpCodes).values({
    phone,
    purpose,
    codeHash: digest(code),
    expiresAt,
  });

  return { code, expiresAt };
}

export type OtpVerifyResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "expired" | "too_many_attempts" | "mismatch"; attemptsLeft: number };

/** Verify a submitted code against the newest active OTP for the phone. */
export async function verifyOtp(
  phone: string,
  purpose: OtpPurpose,
  code: string,
): Promise<OtpVerifyResult> {
  const [record] = await db
    .select()
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.phone, phone),
        eq(otpCodes.purpose, purpose),
        isNull(otpCodes.consumedAt),
      ),
    )
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);

  if (!record) return { ok: false, reason: "not_found", attemptsLeft: 0 };

  if (record.expiresAt.getTime() <= Date.now()) {
    await db.update(otpCodes).set({ consumedAt: new Date() }).where(eq(otpCodes.id, record.id));
    return { ok: false, reason: "expired", attemptsLeft: 0 };
  }

  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    await db.update(otpCodes).set({ consumedAt: new Date() }).where(eq(otpCodes.id, record.id));
    return { ok: false, reason: "too_many_attempts", attemptsLeft: 0 };
  }

  if (!safeEqual(digest(code), record.codeHash)) {
    const attempts = record.attempts + 1;
    await db.update(otpCodes).set({ attempts }).where(eq(otpCodes.id, record.id));
    const attemptsLeft = Math.max(0, OTP_MAX_ATTEMPTS - attempts);
    if (attemptsLeft === 0) {
      await db.update(otpCodes).set({ consumedAt: new Date() }).where(eq(otpCodes.id, record.id));
    }
    return { ok: false, reason: "mismatch", attemptsLeft };
  }

  await db.update(otpCodes).set({ consumedAt: new Date() }).where(eq(otpCodes.id, record.id));
  return { ok: true };
}

/** Issue the short-lived proof used to finish registration / password reset. */
export async function issueVerificationToken(
  phone: string,
  purpose: OtpPurpose,
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + VERIFICATION_TTL_SEC * 1000);

  await db.insert(verificationTokens).values({
    phone,
    purpose,
    tokenHash: digest(token),
    expiresAt,
  });

  return { token, expiresAt };
}

/**
 * Look up a still-valid verification token WITHOUT consuming it.
 * Returns its id, or null if missing, expired, used, or bound to another phone.
 *
 * Kept separate from consumption so that a later validation failure
 * (weak password, mismatch, …) does not burn the user's verified state.
 */
export async function findValidVerificationToken(
  phone: string,
  purpose: OtpPurpose,
  token: string,
): Promise<number | null> {
  if (!token) return null;

  const [record] = await db
    .select({ id: verificationTokens.id })
    .from(verificationTokens)
    .where(
      and(
        eq(verificationTokens.tokenHash, digest(token)),
        eq(verificationTokens.phone, phone),
        eq(verificationTokens.purpose, purpose),
        isNull(verificationTokens.usedAt),
        gt(verificationTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);

  return record?.id ?? null;
}

/** Mark a verification token as used (single-use enforcement). */
export async function markVerificationTokenUsed(id: number): Promise<void> {
  await db
    .update(verificationTokens)
    .set({ usedAt: new Date() })
    .where(eq(verificationTokens.id, id));
}
