"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";

export function TrackSearch() {
  const router = useRouter();
  const [code, setCode] = useState("");

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const clean = code.trim();
    if (clean) {
      router.push(`/track/${encodeURIComponent(clean)}`);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="field">
        <label htmlFor="trackingCode">کد پیگیری سفارش</label>
        <input
          id="trackingCode"
          name="trackingCode"
          type="text"
          dir="ltr"
          className="text-left"
          placeholder="SF-1001"
          autoComplete="off"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />
        <span className="hint">
          کد پیگیری بعد از ثبت سفارش برات دایرکت می‌شه. برای تست: SF-1001
        </span>
      </div>
      <button type="submit" className="btn btn-primary btn-block">
        <Search size={18} />
        پیگیری سفارش
      </button>
    </form>
  );
}
