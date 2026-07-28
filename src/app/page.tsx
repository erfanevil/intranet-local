"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveAuth, getToken } from "@/lib/client-auth";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getToken()) router.push("/dashboard");
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "خطایی رخ داد"); return; }
      saveAuth(data.token, data.user);
      router.push("/dashboard");
    } catch { setError("خطا در اتصال به سرور"); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left - Form */}
      <div className="flex-1 flex flex-col justify-center px-8 lg:px-20 bg-white">
        <div className="w-full max-w-md mx-auto">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <img src="/api/logo" alt="" className="w-12 h-12 object-contain" />
            <h1 className="text-lg font-bold text-slate-800">شهرداری لاهیجان</h1>
          </div>

          <h2 className="text-3xl font-extrabold text-slate-900 mb-2">ورود به سامانه</h2>
          <p className="text-slate-500 mb-8">اطلاعات کاربری خود را وارد نمایید</p>

          {error && (
            <div className="bg-red-50 border-r-4 border-red-500 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2 text-sm">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">نام کاربری</label>
              <div className="relative">
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </span>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full pr-12 pl-4 py-3.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-slate-50 focus:bg-white text-sm" placeholder="نام کاربری" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">رمز عبور</label>
              <div className="relative">
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </span>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pr-12 pl-4 py-3.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-slate-50 focus:bg-white text-sm" placeholder="••••••••" required />
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-gradient-to-l from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-blue-500/25 hover:shadow-xl">
              {loading ? <span className="flex items-center justify-center gap-2"><svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>در حال ورود...</span> : "ورود به سامانه"}
            </button>
          </form>
          <p className="mt-8 text-center text-xs text-slate-400">در صورت فراموشی رمز عبور با واحد فناوری اطلاعات تماس بگیرید</p>
        </div>
      </div>

      {/* Right - Branding */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-10 right-10 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-10 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl" />
          {/* Decorative SVG Pattern */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
            <defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/></pattern></defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col justify-center items-center w-full px-12 text-center">
          {/* Logo */}
          <div className="w-32 h-32 bg-white/10 backdrop-blur-sm rounded-3xl flex items-center justify-center mb-8 shadow-2xl border border-white/20">
            <img src="/api/logo" alt="شهرداری" className="w-24 h-24 object-contain" />
          </div>
          <h1 className="text-4xl font-extrabold text-white mb-3">شهرداری لاهیجان</h1>
          <p className="text-lg text-blue-200 mb-10">سامانه جامع ارتباطات و مکاتبات داخلی</p>

          {/* Feature Cards */}
          <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10 text-right">
              <svg className="w-8 h-8 text-blue-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              <h3 className="font-bold text-white text-sm">نامه‌نگاری</h3>
              <p className="text-xs text-blue-300 mt-1">ارسال و دریافت نامه رسمی</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10 text-right">
              <svg className="w-8 h-8 text-blue-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
              <h3 className="font-bold text-white text-sm">مدیریت فایل</h3>
              <p className="text-xs text-blue-300 mt-1">اشتراک‌گذاری اسناد</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10 text-right">
              <svg className="w-8 h-8 text-blue-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              <h3 className="font-bold text-white text-sm">پیام‌رسان</h3>
              <p className="text-xs text-blue-300 mt-1">چت آنلاین با همکاران</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10 text-right">
              <svg className="w-8 h-8 text-blue-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              <h3 className="font-bold text-white text-sm">امنیت</h3>
              <p className="text-xs text-blue-300 mt-1">شبکه داخلی امن</p>
            </div>
          </div>
        </div>

        <div className="absolute bottom-6 left-0 right-0 text-center text-blue-300 text-xs">
          توسعه و طراحی توسط واحد فناوری اطلاعات
        </div>
      </div>
    </div>
  );
}
