"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff, TriangleAlert } from "lucide-react";

export function FormAlert({ message }: { message: string }) {
  return (
    <div className="form-alert error" role="alert">
      <TriangleAlert size={18} />
      <span>{message}</span>
    </div>
  );
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  fieldClassName?: string;
}

export function TextField({
  label,
  error,
  hint,
  id,
  fieldClassName = "",
  ...props
}: TextFieldProps) {
  return (
    <div className={`field${error ? " has-error" : ""} ${fieldClassName}`.trim()}>
      <label htmlFor={id}>{label}</label>
      <input id={id} aria-invalid={Boolean(error)} {...props} />
      {error ? <span className="error-text">{error}</span> : null}
      {!error && hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}

/** Iranian mobile input: LTR, numeric keypad, tabular digits. */
export function PhoneField(props: Omit<TextFieldProps, "type">) {
  return (
    <TextField
      {...props}
      type="tel"
      inputMode="numeric"
      autoComplete="tel"
      dir="ltr"
      maxLength={13}
      placeholder={props.placeholder ?? "09123456789"}
      fieldClassName="phone-field"
    />
  );
}

export function PasswordField({ label, error, hint, id, ...props }: TextFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={`field${error ? " has-error" : ""}`}>
      <label htmlFor={id}>{label}</label>
      <div className="password-field">
        <input
          id={id}
          type={visible ? "text" : "password"}
          aria-invalid={Boolean(error)}
          {...props}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "پنهان کردن رمز عبور" : "نمایش رمز عبور"}
          tabIndex={-1}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error ? <span className="error-text">{error}</span> : null}
      {!error && hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}
