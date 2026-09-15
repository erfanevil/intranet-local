export interface ApiFailure {
  ok: false;
  error: { code: string; message: string; fields?: Record<string, string> };
  retryAfterSec?: number;
}

export type ApiResult<T> = ({ ok: true } & T) | ApiFailure;

/** Typed POST helper for the auth endpoints. */
export async function postJson<T extends object>(
  url: string,
  body: unknown,
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (!res.ok || data.ok !== true) {
      const error = (data.error ?? {}) as { code?: string; message?: string; fields?: Record<string, string> };
      return {
        ok: false,
        error: {
          code: error.code ?? "unknown",
          message: error.message ?? "خطای غیرمنتظره‌ای رخ داد. دوباره تلاش کنید.",
          fields: error.fields,
        },
        retryAfterSec: typeof data.retryAfterSec === "number" ? data.retryAfterSec : undefined,
      };
    }

    return data as ({ ok: true } & T);
  } catch {
    return {
      ok: false,
      error: { code: "network", message: "ارتباط با سرور برقرار نشد. اینترنت خود را بررسی کنید." },
    };
  }
}

export interface RequestOtpResponse {
  phone: string;
  maskedPhone: string;
  expiresInSec: number;
  resendAfterSec: number;
  codeLength: number;
  delivery: "sent" | "not_configured" | "failed";
  devCode?: string;
}

export interface VerifyOtpResponse {
  phone: string;
  verificationToken: string;
  expiresAt: string;
}

export interface AuthSuccessResponse {
  redirectTo: string;
}
