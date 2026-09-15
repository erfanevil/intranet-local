import { NextResponse } from "next/server";
import { toEnglishDigits } from "@/lib/auth/phone";

export interface ApiErrorBody {
  ok: false;
  error: { code: string; message: string; fields?: Record<string, string> };
  retryAfterSec?: number;
}

export function apiError(
  status: number,
  code: string,
  message: string,
  extra?: { fields?: Record<string, string>; retryAfterSec?: number },
): NextResponse<ApiErrorBody> {
  const body: ApiErrorBody = {
    ok: false,
    error: { code, message, ...(extra?.fields ? { fields: extra.fields } : {}) },
  };
  if (extra?.retryAfterSec !== undefined) body.retryAfterSec = extra.retryAfterSec;

  const headers = extra?.retryAfterSec
    ? { "Retry-After": String(extra.retryAfterSec) }
    : undefined;

  return NextResponse.json(body, { status, headers });
}

export function apiOk<T extends object>(data: T, status = 200): NextResponse {
  return NextResponse.json({ ok: true, ...data }, { status });
}

/** Parse a JSON body, tolerating malformed payloads. */
export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const data = await request.json();
    return typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Best-effort client IP for rate-limit buckets. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function readString(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  return typeof value === "string" ? value.trim() : "";
}

/** OTP codes arrive as 5–6 digits, possibly with Persian numerals. */
export function normalizeOtpInput(raw: string): string {
  return toEnglishDigits(raw).replace(/\D/g, "");
}

export const PASSWORD_MIN = 8;

/** Returns an error message, or null when the password is acceptable. */
export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN) {
    return "رمز عبور باید حداقل ۸ کاراکتر باشد.";
  }
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
    return "رمز عبور باید ترکیبی از حروف و عدد باشد.";
  }
  return null;
}

export function validateName(value: string, label: string): string | null {
  if (value.length < 2) return `${label} را کامل وارد کنید.`;
  if (value.length > 80) return `${label} بیش از حد طولانی است.`;
  return null;
}
