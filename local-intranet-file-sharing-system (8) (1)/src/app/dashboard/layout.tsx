"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { getToken, getUser, clearAuth, authFetch, saveAuth, type AuthUser } from "@/lib/client-auth";
import Avatar from "@/components/Avatar";
import Notifications from "@/components/Notifications";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadChats, setUnreadChats] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadFiles, setUnreadFiles] = useState(0);
  const [pendingSigns, setPendingSigns] = useState(0);

  useEffect(() => {
    const checkAuth = async () => {
      const token = getToken();
      const savedUser = getUser();
      
      if (!token || !savedUser) {
        router.replace("/");
        return;
      }

      try {
        const res = await authFetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUser(data.user);
            saveAuth(token, data.user);
          } else {
            clearAuth();
            router.replace("/");
          }
        } else {
          clearAuth();
          router.replace("/");
        }
      } catch {
        setUser(savedUser);
      }
      
      setLoading(false);
    };
    
    checkAuth();
  }, [router]);

  // Heartbeat for online status
  useEffect(() => {
    if (!user) return;
    
    const markOnline = () => {
      authFetch("/api/online", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOnline: true }),
      }).catch(() => {});
    };

    markOnline();
    const interval = setInterval(markOnline, 15000);
    
    const handleVisibility = () => {
      if (document.hidden) {
        authFetch("/api/online", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isOnline: false }),
        }).catch(() => {});
      } else {
        authFetch("/api/online", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isOnline: true }),
        }).catch(() => {});
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      authFetch("/api/online", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOnline: false }),
      }).catch(() => {});
    };
  }, [user]);

  // Fetch unread counts
  useEffect(() => {
    if (!user) return;
    
    const fetchCounts = async () => {
      try {
        const [chatsRes, msgsRes, filesRes, signsRes] = await Promise.all([
          authFetch("/api/chats/unread"),
          authFetch("/api/messages"),
          authFetch("/api/files"),
          authFetch("/api/sign-requests/pending-count"),
        ]);
        
        if (chatsRes.ok) {
          const data = await chatsRes.json();
          setUnreadChats(data.count || 0);
        }
        if (msgsRes.ok) {
          const data = await msgsRes.json();
          setUnreadMessages(data.messages?.filter((m: {isRead: boolean}) => !m.isRead).length || 0);
        }
        if (filesRes.ok) {
          const data = await filesRes.json();
          setUnreadFiles(data.files?.filter((f: {isRead: boolean}) => !f.isRead).length || 0);
        }
        if (signsRes.ok) {
          const data = await signsRes.json();
          setPendingSigns(data.count || 0);
        }
      } catch {}
    };
    
    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, [user]);



  const handleLogout = () => {
    clearAuth();
    router.replace("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <img src="/api/logo" alt="شهرداری" className="w-16 h-16 mb-2" />
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-medium">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const navItems = [
    {
      href: "/dashboard",
      label: "داشبورد",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      badge: 0,
    },
    {
      href: "/dashboard/messages",
      label: "نامه‌ها",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      badge: unreadMessages,
    },
    {
      href: "/dashboard/files",
      label: "فایل‌ها",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      ),
      badge: unreadFiles,
    },
    {
      href: "/dashboard/chat",
      label: "پیام‌رسان",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      badge: unreadChats,
    },
    {
      href: "/dashboard/signatures",
      label: "امضا الکترونیک",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      ),
      badge: pendingSigns,
    },
    {
      href: "/dashboard/send",
      label: "ارسال جدید",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      ),
      badge: 0,
    },
    {
      href: "/dashboard/archive",
      label: "بایگانی",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V7a2 2 0 00-2-2H6a2 2 0 00-2 2v6m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4m4 0h8" />
        </svg>
      ),
      badge: 0,
    },

  ];

  if (user.isAdmin) {
    navItems.push({
      href: "/dashboard/admin",
      label: "مدیریت کاربران",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      badge: 0,
    });
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 w-72 bg-white shadow-2xl transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-5 bg-gradient-to-l from-blue-600 to-blue-800">
            <div className="flex items-center gap-3">
              <img 
                src="/api/logo" 
                alt="شهرداری لاهیجان" 
                className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl p-1 object-contain"
              />
              <div>
                <h3 className="font-bold text-white text-sm">شهرداری لاهیجان</h3>
                <p className="text-xs text-blue-200">سامانه ارتباطات داخلی</p>
              </div>
            </div>
          </div>

          {/* User Card */}
          <div className="p-4 border-b border-slate-100">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <Avatar avatar={user.avatar} name={user.displayName} size="md" isOnline={true} />
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-slate-800 truncate">{user.displayName}</h4>
                <p className="text-xs text-blue-600 truncate">{user.position}</p>
              </div>
              {user.isAdmin && (
                <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-lg">
                  مدیر
                </span>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all font-medium group ${
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge > 0 && (
                    <span className="min-w-[22px] h-[22px] flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full px-1.5">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-3 border-t border-slate-100">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>خروج از سامانه</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:mr-72">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-slate-200">
          <div className="flex items-center justify-between px-4 lg:px-6 py-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl hover:bg-slate-100 transition"
            >
              <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            <div className="flex items-center gap-4">
              {/* Notification Bell */}
              {(unreadMessages + unreadFiles + unreadChats + pendingSigns) > 0 && (
                <div className="relative">
                  <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full px-1">
                    {unreadMessages + unreadFiles + unreadChats + pendingSigns}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-slate-500 hidden sm:inline">آنلاین</span>
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs text-slate-500">
                  {new Intl.DateTimeFormat("fa-IR", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Tehran" }).format(new Date())}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Notifications */}
        <Notifications />

        {/* Page Content */}
        <main className="p-4 lg:p-6">
          {children}
        </main>

        {/* Footer */}
        <footer className="py-4 px-6 text-center text-slate-400 text-xs border-t border-slate-200 bg-white">
          توسعه و طراحی توسط واحد فناوری اطلاعات شهرداری لاهیجان
        </footer>
      </div>
    </div>
  );
}
