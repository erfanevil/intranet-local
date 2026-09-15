"use client";

import {
  useEffect,
  useRef,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import { toEnglishDigits } from "@/lib/auth/phone";

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  /** Fired when every box is filled (auto-submit). */
  onComplete?: (value: string) => void;
  hasError?: boolean;
  disabled?: boolean;
}

export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  hasError = false,
  disabled = false,
}: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const completedFor = useRef<string>("");

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (value.length === length && completedFor.current !== value) {
      completedFor.current = value;
      onComplete?.(value);
    }
    if (value.length < length) completedFor.current = "";
  }, [value, length, onComplete]);

  const setDigit = (index: number, digit: string) => {
    const chars = value.padEnd(length, " ").split("");
    chars[index] = digit || " ";
    onChange(chars.join("").replace(/\s/g, "").slice(0, length));
  };

  const handleChange = (index: number, raw: string) => {
    const digits = toEnglishDigits(raw).replace(/\D/g, "");
    if (!digits) {
      setDigit(index, "");
      return;
    }

    // Support pasting/auto-fill of the whole code into one box.
    if (digits.length > 1) {
      const next = (value.slice(0, index) + digits).slice(0, length);
      onChange(next);
      refs.current[Math.min(next.length, length - 1)]?.focus();
      return;
    }

    const chars = value.split("");
    chars[index] = digits;
    onChange(chars.join("").slice(0, length));
    if (index < length - 1) refs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      if (value[index]) {
        onChange(value.slice(0, index) + value.slice(index + 1));
      } else if (index > 0) {
        onChange(value.slice(0, index - 1) + value.slice(index));
        refs.current[index - 1]?.focus();
      }
      return;
    }
    // Visual order is RTL-reversed, so arrows are swapped.
    if (event.key === "ArrowRight" && index > 0) {
      event.preventDefault();
      refs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowLeft" && index < length - 1) {
      event.preventDefault();
      refs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const digits = toEnglishDigits(event.clipboardData.getData("text"))
      .replace(/\D/g, "")
      .slice(0, length);
    if (!digits) return;
    onChange(digits);
    refs.current[Math.min(digits.length, length - 1)]?.focus();
  };

  return (
    <div
      className={`otp-inputs${hasError ? " has-error" : ""}`}
      dir="ltr"
      role="group"
      aria-label="کد تأیید"
    >
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={length}
          className={value[i] ? "filled" : ""}
          value={value[i] ?? ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          disabled={disabled}
          aria-label={`رقم ${i + 1} کد تأیید`}
        />
      ))}
    </div>
  );
}
