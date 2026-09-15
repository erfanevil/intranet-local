import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { TrackSearch } from "./track-search";

export const metadata: Metadata = {
  title: "پیگیری سفارش",
  description:
    "با کد پیگیری، وضعیت سفارش اینستاگرامی‌ات رو لحظه‌ای ببین؛ از پرداخت تا تحویل.",
};

export default function TrackPage() {
  return (
    <div className="subpage-shell">
      <a href="#main" className="skip-link">
        رفتن به محتوای اصلی
      </a>
      <SiteHeader />
      <main id="main" className="subpage-main">
        <div className="container-x">
          <div className="subpage-card mx-auto w-full max-w-xl">
            <div className="mb-8">
              <span className="section-kicker">پیگیری سفارش</span>
              <h1 className="font-[family-name:var(--font-head)] text-[clamp(1.5rem,3vw,2rem)] font-extrabold">
                سفارشت کجاست؟
              </h1>
              <p className="mt-2 text-[0.96rem] leading-8 text-[var(--muted)]">
                کد پیگیری رو وارد کن تا وضعیت دقیق سفارشت رو لحظه‌ای ببینی؛ بدون
                نیاز به پیام دادن و منتظر موندن.
              </p>
            </div>
            <TrackSearch />
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
