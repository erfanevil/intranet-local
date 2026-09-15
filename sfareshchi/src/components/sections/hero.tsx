"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, ShoppingBag } from "lucide-react";

export function Hero() {
  const [reveal, setReveal] = useState(false);

  useEffect(() => {
    setReveal(true);
  }, []);

  return (
    <section className={`hero${reveal ? " reveal" : ""}`} id="top">
      <div className="container-x hero-inner">
        <div className="hero-copy">
          <span className="hero-badge">
            <ShoppingBag size={16} strokeWidth={2} />
            مخصوص فروشنده‌های اینستاگرامی
          </span>
          <h1>
            فروش از دایرکت،
            <br />
            ساده‌تر از همیشه.
          </h1>
          <p className="hero-sub">
            سفارشچی پیام‌های سفارش رو از دایرکت اینستاگرام جمع می‌کنه، سفارش رو
            ثبت می‌کنه و پرداخت و ارسال رو برات پیگیری می‌کنه؛ بدون اسکرول
            بی‌پایان و بدون سفارش گم‌شده.
          </p>
          <div className="hero-ctas">
            <Link href="/auth/register" className="btn btn-primary">
              شروع رایگان
            </Link>
            <Link href="#how" className="btn btn-ghost">
              ببین چطور کار می‌کند
            </Link>
          </div>
          <div className="hero-trust">
            <Check size={16} strokeWidth={2.4} />
            بدون نیاز به کارت بانکی
          </div>
        </div>
        <div className="hero-visual">
          <span className="glow" aria-hidden="true" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/poster.jpg"
            alt="نمایش گفت‌وگوی خرید در دایرکت اینستاگرام کنار پنل مدیریت سفارش‌های سفارشچی روی لپ‌تاپ"
          />
        </div>
      </div>
    </section>
  );
}
