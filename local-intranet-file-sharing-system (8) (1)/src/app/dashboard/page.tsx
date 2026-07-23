"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authFetch, getUser } from "@/lib/client-auth";

export default function DashboardPage() {
  const [stats, setStats] = useState({ unreadFiles: 0, totalFiles: 0, unreadMessages: 0, totalMessages: 0, unreadChats: 0, pendingSigns: 0 });
  const user = getUser();

  useEffect(() => {
    Promise.all([
      authFetch("/api/files").then(r => r.json()),
      authFetch("/api/messages").then(r => r.json()),
      authFetch("/api/chats/unread").then(r => r.json()),
      authFetch("/api/sign-requests/pending-count").then(r => r.json()),
    ]).then(([fd, md, cd, sd]) => {
      const f = fd.files || [], m = md.messages || [];
      setStats({
        totalFiles: f.length, unreadFiles: f.filter((x: {isRead:boolean}) => !x.isRead).length,
        totalMessages: m.length, unreadMessages: m.filter((x: {isRead:boolean}) => !x.isRead).length,
        unreadChats: cd.count || 0, pendingSigns: sd.count || 0,
      });
    });
  }, []);

  const cards = [
    { title: "نامه‌ها", desc: "مکاتبات رسمی", href: "/dashboard/messages", total: stats.totalMessages, unread: stats.unreadMessages,
      icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
      color: "from-blue-500 to-blue-600", bg: "bg-blue-50", tc: "text-blue-600" },
    { title: "فایل‌ها", desc: "اسناد و فایل‌ها", href: "/dashboard/files", total: stats.totalFiles, unread: stats.unreadFiles,
      icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>,
      color: "from-amber-500 to-orange-500", bg: "bg-amber-50", tc: "text-amber-600" },
    { title: "پیام‌رسان", desc: "چت با همکاران", href: "/dashboard/chat", total: null, unread: stats.unreadChats,
      icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
      color: "from-emerald-500 to-teal-500", bg: "bg-emerald-50", tc: "text-emerald-600" },
    { title: "امضا الکترونیک", desc: "نیاز به امضای شما", href: "/dashboard/signatures", total: null, unread: stats.pendingSigns,
      icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>,
      color: "from-purple-500 to-indigo-500", bg: "bg-purple-50", tc: "text-purple-600" },
    { title: "ارسال جدید", desc: "نامه، فایل یا درخواست امضا", href: "/dashboard/send", total: null, unread: null,
      icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>,
      color: "from-slate-500 to-slate-600", bg: "bg-slate-50", tc: "text-slate-600" },
  ];

  return (
    <div>
      <div className="bg-gradient-to-l from-blue-600 to-blue-800 rounded-2xl p-6 mb-6 text-white">
        <div className="flex items-center gap-4">
          <img src="/api/logo" alt="" className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl object-contain p-1.5" />
          <div><h1 className="text-xl font-bold">خوش آمدید، {user?.displayName}</h1><p className="text-blue-100 text-sm mt-0.5">{user?.position} • شهرداری لاهیجان</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Link key={c.href} href={c.href}>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 hover:shadow-lg hover:border-blue-200 transition-all group h-full">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center text-white shadow group-hover:scale-110 transition-transform`}>{c.icon}</div>
                {(c.unread ?? 0) > 0 && <span className="min-w-[22px] h-[22px] flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full px-1.5">{c.unread}</span>}
              </div>
              <h3 className="font-bold text-slate-800 text-sm mb-0.5">{c.title}</h3>
              <p className="text-xs text-slate-500 mb-3">{c.desc}</p>
              {c.total !== null && <div className={`${c.bg} ${c.tc} text-xs font-medium px-3 py-1.5 rounded-lg inline-block`}>{c.total} مورد</div>}
            </div>
          </Link>
        ))}
      </div>

      {user?.isAdmin && (
        <div className="mt-6 bg-purple-50 border border-purple-200 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center text-white">⚙️</div>
              <div><h3 className="font-bold text-purple-800 text-sm">پنل مدیریت</h3><p className="text-xs text-purple-600">مدیریت کاربران و دسترسی‌ها</p></div>
            </div>
            <Link href="/dashboard/admin" className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition text-sm font-medium">ورود</Link>
          </div>
        </div>
      )}
    </div>
  );
}
