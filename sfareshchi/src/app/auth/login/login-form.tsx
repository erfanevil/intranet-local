"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthHead, AuthShell } from "@/components/auth/auth-shell";
import { FormAlert, PasswordField, PhoneField } from "@/components/auth/fields";
import { postJson, type AuthSuccessResponse } from "@/lib/auth/client";

export function LoginForm() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    setFieldErrors({});

    const data = new FormData(event.currentTarget);
    const result = await postJson<AuthSuccessResponse>("/api/auth/login", {
      phone,
      password: String(data.get("password") ?? ""),
    });

    if (!result.ok) {
      setError(result.error.message);
      setFieldErrors(result.error.fields ?? {});
      setPending(false);
      return;
    }

    router.push(result.redirectTo);
    router.refresh();
  };

  return (
    <AuthShell>
      <AuthHead
        title="ورود به سفارشچی"
        description="با شماره موبایل و رمز عبور خود وارد شوید."
      />
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        {error ? <FormAlert message={error} /> : null}
        <PhoneField
          id="phone"
          name="phone"
          label="شماره موبایل"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={fieldErrors.phone}
          autoFocus
          required
        />
        <PasswordField
          id="password"
          name="password"
          label="رمز عبور"
          autoComplete="current-password"
          error={fieldErrors.password}
          required
        />
        <div style={{ marginTop: -6, textAlign: "start" }}>
          <Link
            href="/auth/forgot-password"
            style={{ fontSize: "0.86rem", color: "var(--primary-dark)", fontWeight: 600 }}
          >
            رمز عبور را فراموش کرده‌اید؟
          </Link>
        </div>
        <button type="submit" className="btn btn-primary btn-block" disabled={pending}>
          {pending ? "در حال ورود…" : "ورود"}
        </button>
      </form>
      <div className="auth-foot">
        حساب کاربری ندارید؟ <Link href="/auth/register">ثبت‌نام رایگان</Link>
      </div>
    </AuthShell>
  );
}
