import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Vazirmatn } from "next/font/google";
import "./globals.css";

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-vazirmatn",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "سفارشچی | فروش از دایرکت، ساده‌تر از همیشه",
    template: "%s | سفارشچی",
  },
  description:
    "سفارشچی سفارش‌های دایرکت اینستاگرام رو خودکار جمع می‌کنه، ثبت می‌کنه و پرداخت و ارسال رو برات پیگیری می‌کنه؛ بدون پیام گم‌شده و بدون سردرگمی.",
  icons: { icon: "/assets/logo.png" },
  openGraph: {
    title: "سفارشچی | فروش از دایرکت، ساده‌تر از همیشه",
    description: "مدیریت سفارش‌های اینستاگرام، از دایرکت تا ارسال، همه در یک پنل.",
    type: "website",
    locale: "fa_IR",
  },
};

export const viewport: Viewport = {
  themeColor: "#5B3DF5",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Estedad (headlines) is not bundled with next/font — loaded from Google Fonts */}
        <link
          href="https://fonts.googleapis.com/css2?family=Estedad:wght@500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
