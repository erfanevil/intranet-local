"use client";

import Link from "next/link";
import {
  FileCog,
  BotMessageSquare,
  Satellite,
  ArrowLeft,
  Wrench,
  FileImage,
  FileText,
  MessagesSquare,
  Ruler,
  Search,
  MapPin,
  Wand2,
} from "lucide-react";

const tools = [
  {
    href: "/dashboard/tools/convert",
    icon: FileCog,
    title: "تبدیل فرمت فایل",
    desc: "تبدیل تصاویر، PDF، اسناد Word، CSV و JSON به فرمت‌های مختلف بدون نیاز به نرم‌افزار",
    color: "from-rose-500 to-orange-500",
    soft: "bg-rose-50 text-rose-700 border-rose-200",
    features: [
      { icon: FileImage, label: "تصویر ⇄ PNG / JPG / WebP" },
      { icon: FileText, label: "PDF به تصویر و Word به متن" },
      { icon: Wand2, label: "متن به PDF و CSV ⇄ JSON" },
    ],
    tag: "پردازش درون‌سامانه‌ای",
  },
  {
    href: "/dashboard/tools/ai",
    icon: BotMessageSquare,
    title: "دستیار هوش مصنوعی",
    desc: "گفتگو با هوش مصنوعی برای نگارش نامه اداری، خلاصه‌سازی، ترجمه و پاسخ به سوالات کاری",
    color: "from-violet-500 to-fuchsia-500",
    soft: "bg-violet-50 text-violet-700 border-violet-200",
    features: [
      { icon: MessagesSquare, label: "گفتگوی زنده و روان" },
      { icon: FileText, label: "تنظیم نامه و بخش‌نامه رسمی" },
      { icon: Wand2, label: "خلاصه‌سازی و ایده‌پردازی" },
    ],
    tag: "رایگان و بدون محدودیت",
  },
  {
    href: "/dashboard/tools/map",
    icon: Satellite,
    title: "تصویر ماهواره‌ای",
    desc: "مشاهده تصاویر ماهواره‌ای گوگل داخل سامانه با ابزارهای کاربردی برای کارکنان شهرداری",
    color: "from-sky-500 to-emerald-500",
    soft: "bg-sky-50 text-sky-700 border-sky-200",
    features: [
      { icon: Search, label: "جستجو با مختصات و نام مکان" },
      { icon: Ruler, label: "محاسبه متراژ و مسافت" },
      { icon: MapPin, label: "موقعیت‌یابی و ثبت نقطه" },
    ],
    tag: "مناسب واحد شهرسازی",
  },
];

export default function ToolsPage() {
  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-slate-800 to-slate-900 p-6 lg:p-8 text-white">
        <div className="absolute -left-16 -top-16 w-56 h-56 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute left-1/3 -bottom-20 w-64 h-64 bg-violet-500/20 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur border border-white/15 flex items-center justify-center">
            <Wrench className="w-7 h-7 text-blue-300" />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold">ابزارک‌های سامانه</h1>
            <p className="text-slate-300 text-sm mt-1">
              ابزارهای کمکی هوشمند برای انجام سریع‌تر کارهای روزمره کارکنان شهرداری لاهیجان
            </p>
          </div>
        </div>
      </div>

      {/* Tool cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {tools.map((t) => (
          <Link key={t.href} href={t.href} className="group">
            <div className="relative h-full bg-white rounded-2xl border border-slate-200 p-6 overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-transparent">
              <div
                className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-l ${t.color} opacity-0 group-hover:opacity-100 transition-opacity`}
              />
              <div className="flex items-start justify-between mb-5">
                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${t.color} text-white flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}
                >
                  <t.icon className="w-7 h-7" />
                </div>
                <span className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border ${t.soft}`}>
                  {t.tag}
                </span>
              </div>

              <h3 className="font-bold text-slate-800 text-base mb-1.5">{t.title}</h3>
              <p className="text-xs text-slate-500 leading-6 mb-5 min-h-[48px]">{t.desc}</p>

              <ul className="space-y-2 mb-6">
                {t.features.map((f) => (
                  <li key={f.label} className="flex items-center gap-2 text-xs text-slate-600">
                    <f.icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {f.label}
                  </li>
                ))}
              </ul>

              <div className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 group-hover:gap-3 transition-all">
                ورود به ابزار
                <ArrowLeft className="w-4 h-4" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-xs text-blue-700 leading-6">
        نکته: تمامی ابزارها داخل همین سامانه اجرا می‌شوند و فایل‌های شما برای تبدیل فرمت جایی ارسال
        نمی‌شود؛ پردازش روی مرورگر یا سرور داخلی انجام می‌گیرد.
      </div>
    </div>
  );
}
