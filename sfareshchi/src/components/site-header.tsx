"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { href: "/#features", label: "امکانات" },
  { href: "/#how", label: "نحوه کار" },
  { href: "/#pricing", label: "قیمت‌گذاری" },
  { href: "/#faq", label: "سوالات متداول" },
  { href: "/track", label: "پیگیری سفارش" },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`site-header${scrolled ? " is-scrolled" : ""}`}>
      <div className="container-x header-row">
        <Link href="/" className="brand" aria-label="سفارشچی، صفحه اصلی">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/logo.png" alt="سفارشچی" />
        </Link>

        <button
          type="button"
          className="nav-toggle-label"
          aria-label={open ? "بستن منو" : "باز کردن منو"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>

        <nav className="main-nav" data-open={open} aria-label="منوی اصلی">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="header-actions">
          <Link href="/auth/login" className="login-link">
            ورود
          </Link>
          <Link href="/auth/register" className="btn btn-primary btn-sm">
            شروع رایگان
          </Link>
        </div>
      </div>
    </header>
  );
}
