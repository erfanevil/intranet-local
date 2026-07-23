import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "شهرداری لاهیجان - سامانه مدیریت فایل و نامه",
  description: "سیستم تبادل فایل و نامه در شبکه داخلی شهرداری لاهیجان",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body className="bg-gray-50 text-gray-900 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
