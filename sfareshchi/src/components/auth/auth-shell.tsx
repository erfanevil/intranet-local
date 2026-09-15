import Link from "next/link";
import type { ReactNode } from "react";

interface AuthShellProps {
  children: ReactNode;
  /** 1-based current step; omit for single-step pages. */
  step?: number;
  totalSteps?: number;
}

export function AuthShell({ children, step, totalSteps }: AuthShellProps) {
  return (
    <div className="auth-shell">
      <div className="auth-topbar">
        <Link href="/" aria-label="سفارشچی، صفحه اصلی">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/logo.png" alt="سفارشچی" />
        </Link>
      </div>
      <main className="auth-main">
        <div className="auth-card">
          {step && totalSteps ? (
            <div className="auth-steps" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={totalSteps}>
              {Array.from({ length: totalSteps }, (_, i) => (
                <span
                  key={i}
                  className={`auth-step-bar${i < step ? " is-active" : ""}`}
                />
              ))}
            </div>
          ) : null}
          {children}
        </div>
      </main>
    </div>
  );
}

export function AuthHead({ title, description }: { title: string; description?: string }) {
  return (
    <div className="auth-head">
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
    </div>
  );
}
