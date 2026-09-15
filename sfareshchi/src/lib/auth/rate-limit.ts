import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { authAttempts } from "@/db/schema";

export interface RateRule {
  /** Max allowed hits inside the window. */
  limit: number;
  /** Window length in seconds. */
  windowSec: number;
}

export interface RateResult {
  ok: boolean;
  /** Seconds the caller must wait before retrying. */
  retryAfterSec: number;
  remaining: number;
}

/** Record one hit for a bucket. */
export async function recordAttempt(bucket: string): Promise<void> {
  await db.insert(authAttempts).values({ bucket });
}

/**
 * Sliding-window check. Does not record the hit — call `recordAttempt`
 * separately so reads and writes stay explicit.
 */
export async function checkRate(bucket: string, rule: RateRule): Promise<RateResult> {
  const since = new Date(Date.now() - rule.windowSec * 1000);

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(authAttempts)
    .where(and(eq(authAttempts.bucket, bucket), gte(authAttempts.createdAt, since)));

  const used = row?.count ?? 0;
  if (used < rule.limit) {
    return { ok: true, retryAfterSec: 0, remaining: rule.limit - used - 1 };
  }

  // Oldest hit in the window decides when a slot frees up.
  const [oldest] = await db
    .select({ createdAt: authAttempts.createdAt })
    .from(authAttempts)
    .where(and(eq(authAttempts.bucket, bucket), gte(authAttempts.createdAt, since)))
    .orderBy(authAttempts.createdAt)
    .limit(1);

  const freesAt = oldest
    ? oldest.createdAt.getTime() + rule.windowSec * 1000
    : Date.now() + rule.windowSec * 1000;

  return {
    ok: false,
    retryAfterSec: Math.max(1, Math.ceil((freesAt - Date.now()) / 1000)),
    remaining: 0,
  };
}

/** Seconds remaining before a new OTP may be requested (resend cooldown). */
export async function cooldownRemaining(
  bucket: string,
  cooldownSec: number,
): Promise<number> {
  const [last] = await db
    .select({ createdAt: authAttempts.createdAt })
    .from(authAttempts)
    .where(eq(authAttempts.bucket, bucket))
    .orderBy(desc(authAttempts.createdAt))
    .limit(1);

  if (!last) return 0;
  const elapsed = (Date.now() - last.createdAt.getTime()) / 1000;
  return elapsed >= cooldownSec ? 0 : Math.ceil(cooldownSec - elapsed);
}

/** Clear a bucket after a successful action (e.g. correct login). */
export async function resetBucket(bucket: string): Promise<void> {
  await db.delete(authAttempts).where(eq(authAttempts.bucket, bucket));
}

export const RULES = {
  /** Max OTPs per phone per hour. */
  otpPerPhoneHourly: { limit: 5, windowSec: 60 * 60 } satisfies RateRule,
  /** Max OTPs per client IP per hour (blocks enumeration). */
  otpPerIpHourly: { limit: 15, windowSec: 60 * 60 } satisfies RateRule,
  /** Failed OTP verifications per phone. */
  otpVerifyPerPhone: { limit: 10, windowSec: 15 * 60 } satisfies RateRule,
  /** Failed logins per phone. */
  loginPerPhone: { limit: 8, windowSec: 15 * 60 } satisfies RateRule,
  /** Failed logins per IP. */
  loginPerIp: { limit: 25, windowSec: 15 * 60 } satisfies RateRule,
} as const;

/** Resend cooldown between two OTPs for the same phone+purpose. */
export const OTP_RESEND_COOLDOWN_SEC = 120;
/** OTP validity window. */
export const OTP_TTL_SEC = 5 * 60;
/** Max wrong guesses for a single code before it is burned. */
export const OTP_MAX_ATTEMPTS = 5;
/** Lifetime of the post-verification token. */
export const VERIFICATION_TTL_SEC = 20 * 60;
