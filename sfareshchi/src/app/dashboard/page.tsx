import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CreditCard, PackageSearch, ShoppingBag, Truck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { formatMobileForDisplay } from "@/lib/auth/phone";
import { LogoutButton } from "./logout-button";

export const metadata: Metadata = { title: "داشبورد" };
export const dynamic = "force-dynamic";

const CARDS = [
  { icon: ShoppingBag, num: "۰", lbl: "سفارش امروز" },
  { icon: CreditCard, num: "۰", lbl: "در انتظار پرداخت" },
  { icon: Truck, num: "۰", lbl: "آماده ارسال" },
  { icon: PackageSearch, num: "۰", lbl: "ارسال‌شده" },
];

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;

  return (
    <div className="dash-shell">
      <header className="dash-header">
        <div className="container-x dash-header-row">
          <Link href="/" aria-label="سفارشچی">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/logo.png" alt="سفارشچی" style={{ height: 24 }} />
          </Link>
          <div className="dash-user">
            <div className="dash-avatar">{initials}</div>
            <div style={{ lineHeight: 1.5 }}>
              <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>
                {user.firstName} {user.lastName}
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--muted-2)" }} dir="ltr">
                {formatMobileForDisplay(user.phone)}
              </div>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="dash-main">
        <div className="container-x">
          <div className="dash-welcome">
            <h1>سلام {user.firstName}، خوش آمدی 👋</h1>
            <p>
              حساب «{user.storeName}» با موفقیت ساخته شد و شماره موبایلت تأیید
              شده است. قدم بعدی، اتصال پیج اینستاگرام است.
            </p>
          </div>

          <div className="dash-grid">
            {CARDS.map((card) => (
              <div key={card.lbl} className="dash-card">
                <div className="icon">
                  <card.icon size={19} strokeWidth={2} />
                </div>
                <div className="num">{card.num}</div>
                <div className="lbl">{card.lbl}</div>
              </div>
            ))}
          </div>

          <div className="dash-card">
            <h2
              style={{
                fontFamily: "var(--font-head)",
                fontSize: "1.05rem",
                fontWeight: 800,
                marginBottom: 8,
              }}
            >
              اتصال پیج اینستاگرام
            </h2>
            <p style={{ color: "var(--muted)", fontSize: "0.92rem", marginBottom: 18 }}>
              با اتصال پیج، سفارش‌های دایرکت به‌صورت خودکار وارد پنل می‌شوند.
              این بخش به‌زودی فعال می‌شود.
            </p>
            <Link href="/track" className="btn btn-ghost btn-sm">
              مشاهده پیگیری سفارش‌ها
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
