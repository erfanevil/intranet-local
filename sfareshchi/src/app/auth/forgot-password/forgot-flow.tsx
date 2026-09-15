"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthHead, AuthShell } from "@/components/auth/auth-shell";
import { FormAlert, PasswordField, PhoneField } from "@/components/auth/fields";
import { OtpStep } from "@/components/auth/otp-step";
import {
  postJson,
  type AuthSuccessResponse,
  type RequestOtpResponse,
} from "@/lib/auth/client";

type Step = "phone" | "otp" | "password";

const REQUEST_URL = "/api/auth/forgot-password/request-otp";
const VERIFY_URL = "/api/auth/forgot-password/verify-otp";

export function ForgotFlow() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [resendAfterSec, setResendAfterSec] = useState(120);
  const [devCode, setDevCode] = useState<string | undefined>();

  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

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

  const submitPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    setFieldErrors({});

    const data = new FormData(event.currentTarget);
    const result = await postJson<AuthSuccessResponse>(
      "/api/auth/forgot-password/reset",
      {
        phone,
        verificationToken,
        password: String(data.get("password") ?? ""),
        confirmPassword: String(data.get("confirmPassword") ?? ""),
      },
    );

    if (!result.ok) {
      setError(result.error.message);
      setFieldErrors(result.error.fields ?? {});
      setPending(false);
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
            title="بازیابی رمز عبور"
            description="شماره موبایل حسابت را وارد کن تا کد تأیید برایت ارسال شود."
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
            رمز عبورت را به یاد آوردی؟ <Link href="/auth/login">ورود</Link>
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
            setStep("password");
          }}
          onEditPhone={() => {
            setStep("phone");
            setError("");
            setFieldErrors({});
          }}
        />
      ) : null}

      {step === "password" ? (
        <>
          <AuthHead
            title="رمز عبور جدید"
            description="شماره موبایل شما تأیید شد. حالا رمز عبور تازه‌ات را انتخاب کن."
          />
          <form className="auth-form" onSubmit={submitPassword} noValidate>
            {error ? <FormAlert message={error} /> : null}
            <PasswordField
              id="password"
              name="password"
              label="رمز عبور جدید"
              autoComplete="new-password"
              placeholder="حداقل ۸ کاراکتر"
              hint="ترکیبی از حروف و عدد، حداقل ۸ کاراکتر."
              error={fieldErrors.password}
              autoFocus
              required
            />
            <PasswordField
              id="confirmPassword"
              name="confirmPassword"
              label="تکرار رمز عبور جدید"
              autoComplete="new-password"
              error={fieldErrors.confirmPassword}
              required
            />
            <button type="submit" className="btn btn-primary btn-block" disabled={pending}>
              {pending ? "در حال ذخیره…" : "تغییر رمز و ورود"}
            </button>
          </form>
        </>
      ) : null}
    </AuthShell>
  );
}
