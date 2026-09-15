"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthHead, AuthShell } from "@/components/auth/auth-shell";
import { FormAlert, PasswordField, PhoneField, TextField } from "@/components/auth/fields";
import { OtpStep } from "@/components/auth/otp-step";
import {
  postJson,
  type AuthSuccessResponse,
  type RequestOtpResponse,
} from "@/lib/auth/client";

type Step = "phone" | "otp" | "account";

const REQUEST_URL = "/api/auth/register/request-otp";
const VERIFY_URL = "/api/auth/register/verify-otp";

export function RegisterFlow() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [resendAfterSec, setResendAfterSec] = useState(120);
  const [devCode, setDevCode] = useState<string | undefined>();

  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  /* ---------------- Step 1: phone ---------------- */
  const submitPhone = async (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    setFieldErrors({});

    const result = await postJson<RequestOtpResponse>(REQUEST_URL, { phone });

    if (!result.ok) {
      setError(result.error.message);
      setFieldErrors(result.error.fields ?? {});
      setPending(false);
      return;
    }

    setPhone(result.phone);
    setResendAfterSec(result.resendAfterSec);
    setDevCode(result.devCode);
    setStep("otp");
    setPending(false);
  };

  /* ---------------- Step 3: account ---------------- */
  const submitAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    setFieldErrors({});

    const data = new FormData(event.currentTarget);
    const payload = {
      phone,
      verificationToken,
      firstName: String(data.get("firstName") ?? ""),
      lastName: String(data.get("lastName") ?? ""),
      storeName: String(data.get("storeName") ?? ""),
      password: String(data.get("password") ?? ""),
      confirmPassword: String(data.get("confirmPassword") ?? ""),
    };

    const result = await postJson<AuthSuccessResponse>("/api/auth/register", payload);

    if (!result.ok) {
      setError(result.error.message);
      setFieldErrors(result.error.fields ?? {});
      setPending(false);
      // Verification expired → restart from the phone step.
      if (result.error.code === "verification_required") {
        setStep("phone");
        setVerificationToken("");
      }
      return;
    }

    router.push(result.redirectTo);
    router.refresh();
  };

  const stepIndex = step === "phone" ? 1 : step === "otp" ? 2 : 3;

  return (
    <AuthShell step={stepIndex} totalSteps={3}>
      {step === "phone" ? (
        <>
          <AuthHead
            title="شماره موبایل خود را وارد کنید"
            description="برای ادامه، یک کد تأیید برای شما ارسال می‌شود."
          />
          <form className="auth-form" onSubmit={submitPhone} noValidate>
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
            <button type="submit" className="btn btn-primary btn-block" disabled={pending}>
              {pending ? "در حال ارسال…" : "دریافت کد تأیید"}
            </button>
          </form>
          <div className="auth-foot">
            قبلاً ثبت‌نام کرده‌اید؟ <Link href="/auth/login">ورود</Link>
          </div>
        </>
      ) : null}

      {step === "otp" ? (
        <OtpStep
          phone={phone}
          requestUrl={REQUEST_URL}
          verifyUrl={VERIFY_URL}
          initialResendAfterSec={resendAfterSec}
          initialDevCode={devCode}
          onVerified={(token) => {
            setVerificationToken(token);
            setStep("account");
          }}
          onEditPhone={() => {
            setStep("phone");
            setError("");
            setFieldErrors({});
          }}
        />
      ) : null}

      {step === "account" ? (
        <>
          <AuthHead
            title="اطلاعات حسابت را کامل کن"
            description="شماره موبایل شما تأیید شد. برای ساخت حساب، اطلاعات زیر را وارد کنید."
          />
          <form className="auth-form" onSubmit={submitAccount} noValidate>
            {error ? <FormAlert message={error} /> : null}
            <TextField
              id="firstName"
              name="firstName"
              label="نام"
              placeholder="مثلاً سارا"
              autoComplete="given-name"
              error={fieldErrors.firstName}
              autoFocus
              required
            />
            <TextField
              id="lastName"
              name="lastName"
              label="نام خانوادگی"
              placeholder="مثلاً محمدی"
              autoComplete="family-name"
              error={fieldErrors.lastName}
              required
            />
            <TextField
              id="storeName"
              name="storeName"
              label="نام فروشگاه"
              placeholder="مثلاً بوتیک مهر"
              error={fieldErrors.storeName}
              required
            />
            <PasswordField
              id="password"
              name="password"
              label="رمز عبور"
              autoComplete="new-password"
              placeholder="حداقل ۸ کاراکتر"
              hint="ترکیبی از حروف و عدد، حداقل ۸ کاراکتر."
              error={fieldErrors.password}
              required
            />
            <PasswordField
              id="confirmPassword"
              name="confirmPassword"
              label="تکرار رمز عبور"
              autoComplete="new-password"
              error={fieldErrors.confirmPassword}
              required
            />
            <button type="submit" className="btn btn-primary btn-block" disabled={pending}>
              {pending ? "در حال ساخت حساب…" : "ساخت حساب"}
            </button>
          </form>
        </>
      ) : null}
    </AuthShell>
  );
}
