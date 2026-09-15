"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PenLine, ShieldCheck } from "lucide-react";
import { AuthHead } from "@/components/auth/auth-shell";
import { FormAlert } from "@/components/auth/fields";
import { OtpInput } from "@/components/auth/otp-input";
import { formatMobileForDisplay } from "@/lib/auth/phone";
import { toFaDigits } from "@/lib/format";
import {
  postJson,
  type RequestOtpResponse,
  type VerifyOtpResponse,
} from "@/lib/auth/client";

interface OtpStepProps {
  phone: string;
  /** Endpoint pair for this flow (register vs. forgot-password). */
  requestUrl: string;
  verifyUrl: string;
  initialResendAfterSec: number;
  initialDevCode?: string;
  onVerified: (verificationToken: string) => void;
  onEditPhone: () => void;
}

function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return toFaDigits(`${m}:${String(s).padStart(2, "0")}`);
}

export function OtpStep({
  phone,
  requestUrl,
  verifyUrl,
  initialResendAfterSec,
  initialDevCode,
  onVerified,
  onEditPhone,
}: OtpStepProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(initialResendAfterSec);
  const [devCode, setDevCode] = useState(initialDevCode);
  const verifiedRef = useRef(false);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const submitCode = useCallback(
    async (value: string) => {
      // Guard against double submits from auto-complete + button click.
      if (pending || verifiedRef.current) return;
      setPending(true);
      setError("");
      setNotice("");

      const result = await postJson<VerifyOtpResponse>(verifyUrl, { phone, code: value });

      if (!result.ok) {
        setError(result.error.message);
        setCode("");
        setPending(false);
        return;
      }

      verifiedRef.current = true;
      onVerified(result.verificationToken);
    },
    [pending, phone, verifyUrl, onVerified],
  );

  const resend = async () => {
    if (secondsLeft > 0 || resending) return;
    setResending(true);
    setError("");
    setNotice("");
    setCode("");

    const result = await postJson<RequestOtpResponse>(requestUrl, { phone });

    if (!result.ok) {
      setError(result.error.message);
      if (result.retryAfterSec) setSecondsLeft(result.retryAfterSec);
      setResending(false);
      return;
    }

    setSecondsLeft(result.resendAfterSec);
    setDevCode(result.devCode);
    setNotice("کد تأیید دوباره ارسال شد.");
    setResending(false);
  };

  return (
    <>
      <AuthHead
        title="کد تأیید را وارد کنید"
        description="کد ۵ یا ۶ رقمی ارسال‌شده به شماره شما را وارد کنید."
      />

      <div className="auth-form">
        <div className="otp-target">
          <ShieldCheck size={17} style={{ color: "var(--primary-dark)" }} />
          <bdi dir="ltr">{formatMobileForDisplay(phone)}</bdi>
          <button type="button" className="auth-link-btn" onClick={onEditPhone}>
            <PenLine size={14} style={{ display: "inline", marginLeft: 4 }} />
            اصلاح شماره
          </button>
        </div>

        {error ? <FormAlert message={error} /> : null}
        {notice && !error ? (
          <div className="form-alert success" role="status">
            {notice}
          </div>
        ) : null}

        <OtpInput
          value={code}
          onChange={setCode}
          onComplete={submitCode}
          hasError={Boolean(error)}
          disabled={pending}
        />

        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={() => submitCode(code)}
          disabled={pending || code.length < 5}
        >
          {pending ? "در حال بررسی…" : "تأیید و ادامه"}
        </button>

        <div className="otp-resend">
          {secondsLeft > 0 ? (
            <>
              <span>ارسال مجدد کد تا</span>
              <span className="otp-countdown">{formatCountdown(secondsLeft)}</span>
            </>
          ) : (
            <button
              type="button"
              className="auth-link-btn"
              onClick={resend}
              disabled={resending}
            >
              {resending ? "در حال ارسال…" : "ارسال مجدد کد"}
            </button>
          )}
        </div>

        {devCode ? (
          <div className="dev-otp-note">
            سرویس پیامک هنوز متصل نشده است، بنابراین پیامکی ارسال نشد. کد تأیید
            برای تست:
            <br />
            <strong dir="ltr">{devCode}</strong>
          </div>
        ) : null}
      </div>
    </>
  );
}
