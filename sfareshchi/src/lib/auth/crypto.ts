import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";

const secret = process.env.AUTH_SECRET;

if (!secret || secret.length < 16) {
  throw new Error("AUTH_SECRET is required (min 16 chars) for authentication.");
}

export const AUTH_SECRET: string = secret;

const BCRYPT_ROUNDS = 12;

/** Hash a password with bcrypt. Plain text is never stored. */
export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Keyed digest for OTP codes and verification tokens.
 * Peppered with AUTH_SECRET so DB contents alone are useless to an attacker.
 */
export function digest(value: string): string {
  return createHmac("sha256", AUTH_SECRET).update(value).digest("hex");
}

/** Constant-time comparison of two hex digests. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Cryptographically-secure numeric OTP (default 6 digits). */
export function generateOtpCode(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i += 1) code += String(randomInt(0, 10));
  return code;
}

/** Opaque, URL-safe verification token. */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}
