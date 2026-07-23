"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { authFetch, getUser, getToken } from "@/lib/client-auth";

interface User {
  id: number; username: string; displayName: string; position: string; phone?: string;
  avatar?: string; signature?: string; canSign: boolean; isAdmin: boolean; createdAt: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [position, setPosition] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [canSign, setCanSign] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [sigFile, setSigFile] = useState<File | null>(null);
  const [sigPreview, setSigPreview] = useState<string | null>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const sigRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!getUser()?.isAdmin) { router.replace("/dashboard"); return; }
    loadUsers();
  }, [router]);

  const loadUsers = async () => {
    const res = await authFetch("/api/admin/users");
    const data = await res.json();
    setUsers(data.users || []);
    setLoading(false);
  };

  const resetForm = () => {
    setUsername(""); setDisplayName(""); setPosition(""); setPassword(""); setPhone("");
    setIsAdmin(false); setCanSign(false);
    setAvatarFile(null); setAvatarPreview(null);
    setSigFile(null); setSigPreview(null);
    setEditingUser(null); setError("");
  };

  const openEdit = (u: User) => {
    setEditingUser(u); setUsername(u.username); setDisplayName(u.displayName);
    setPosition(u.position); setPassword(""); setPhone(u.phone || ""); setIsAdmin(u.isAdmin); setCanSign(u.canSign);
    setAvatarFile(null); setAvatarPreview(u.avatar ? `/api/avatar/${u.avatar}` : null);
    setSigFile(null); setSigPreview(u.signature ? `/api/signature/${u.signature}` : null);
    setShowModal(true);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setAvatarFile(f);
    const r = new FileReader(); r.onloadend = () => setAvatarPreview(r.result as string); r.readAsDataURL(f);
  };

  const handleSigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setSigFile(f);
    const r = new FileReader(); r.onloadend = () => setSigPreview(r.result as string); r.readAsDataURL(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setFormLoading(true); setError("");
    try {
      const fd = new FormData();
      fd.append("displayName", displayName); fd.append("position", position); fd.append("phone", phone);
      fd.append("isAdmin", String(isAdmin)); fd.append("canSign", String(canSign));
      if (password) fd.append("password", password);
      if (avatarFile) fd.append("avatar", avatarFile);
      if (sigFile) fd.append("signature", sigFile);

      const token = getToken();
      if (editingUser) {
        const res = await fetch(`/api/admin/users/${editingUser.id}`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` }, body: fd });
        if (!res.ok) throw new Error((await res.json()).error);
        setSuccess("✅ کاربر ویرایش شد");
      } else {
        fd.append("username", username);
        if (!password) throw new Error("رمز عبور الزامی است");
        const res = await fetch("/api/admin/users", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
        if (!res.ok) throw new Error((await res.json()).error);
        setSuccess("✅ کاربر ایجاد شد");
      }
      setShowModal(false); resetForm(); loadUsers();
    } catch (err) { setError(err instanceof Error ? err.message : "خطا"); }
    finally { setFormLoading(false); }
  };

  const handleDelete = async (u: User) => {
    if (!confirm(`حذف "${u.displayName}"؟`)) return;
    const res = await authFetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
    if (res.ok) { setSuccess("✅ حذف شد"); loadUsers(); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-slate-800">مدیریت کاربران</h1><p className="text-slate-500 mt-1 text-sm">افزودن و مدیریت پرسنل</p></div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="bg-gradient-to-l from-blue-600 to-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm font-medium shadow-lg shadow-blue-500/30 hover:from-blue-700 hover:to-blue-800 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>کاربر جدید
        </button>
      </div>

      {success && <div className="bg-green-50 border-r-4 border-green-500 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">{success}</div>}
      {error && <div className="bg-red-50 border-r-4 border-red-500 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((u) => (
          <div key={u.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition">
            <div className="flex items-start gap-3">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow overflow-hidden">
                {u.avatar ? <img src={`/api/avatar/${u.avatar}`} alt="" className="w-full h-full object-cover" /> : u.displayName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="font-bold text-slate-800 text-sm truncate">{u.displayName}</h3>
                  {u.isAdmin && <span className="bg-purple-100 text-purple-700 text-xs px-1.5 py-0.5 rounded-full">مدیر</span>}
                  {u.canSign && <span className="bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full">امضادار</span>}
                </div>
                <p className="text-xs text-blue-600">{u.position}</p>
                <p className="text-xs text-slate-400">@{u.username}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  {u.signature ? (
                    <span className="text-xs text-green-600 flex items-center gap-1"><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>امضا ثبت شده</span>
                  ) : u.canSign ? (
                    <span className="text-xs text-red-500">⚠️ امضا آپلود نشده</span>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
              <button onClick={() => openEdit(u)} className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition text-xs font-medium">ویرایش</button>
              <button onClick={() => handleDelete(u)} className="flex-1 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition text-xs font-medium">حذف</button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl sticky top-0 z-10">
              <h2 className="text-base font-bold text-slate-800">{editingUser ? "ویرایش کاربر" : "کاربر جدید"}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-200 rounded-lg"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-xs">{error}</div>}

              {/* Avatar */}
              <div className="flex justify-center">
                <div className="relative cursor-pointer group" onClick={() => avatarRef.current?.click()}>
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow overflow-hidden">
                    {avatarPreview ? <img src={avatarPreview} alt="" className="w-full h-full object-cover" /> : (displayName?.charAt(0) || "؟")}
                  </div>
                  <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg></div>
                  <input ref={avatarRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                </div>
              </div>

              <div><label className="block text-xs font-semibold text-slate-700 mb-1">نام کاربری</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} disabled={!!editingUser} required className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition disabled:bg-slate-100 text-sm" placeholder="a.rezaei" /></div>
              <div><label className="block text-xs font-semibold text-slate-700 mb-1">نام و نام خانوادگی</label>
                <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm" placeholder="علی رضایی" /></div>
              <div><label className="block text-xs font-semibold text-slate-700 mb-1">سمت / واحد</label>
                <input type="text" value={position} onChange={(e) => setPosition(e.target.value)} required className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm" placeholder="امور مالی" /></div>
              <div><label className="block text-xs font-semibold text-slate-700 mb-1">شماره موبایل</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm" placeholder="09123456789" dir="ltr" /></div>
              <div><label className="block text-xs font-semibold text-slate-700 mb-1">رمز عبور {editingUser && <span className="text-slate-400 font-normal">(خالی = بدون تغییر)</span>}</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required={!editingUser} className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm" placeholder="••••••••" /></div>

              {/* Permissions */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-700 mb-1">دسترسی‌ها</p>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} className="w-4 h-4 text-blue-600 rounded border-slate-300" />
                  <div><p className="text-sm text-slate-700 font-medium">مدیر سیستم</p><p className="text-xs text-slate-400">مدیریت کاربران و تنظیمات</p></div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={canSign} onChange={(e) => setCanSign(e.target.checked)} className="w-4 h-4 text-amber-600 rounded border-slate-300" />
                  <div><p className="text-sm text-slate-700 font-medium">قابلیت امضا</p><p className="text-xs text-slate-400">می‌تواند اسناد را امضا کند</p></div>
                </label>
              </div>

              {/* Signature Upload - only if canSign is checked */}
              {canSign && (
                <div className="border-2 border-dashed border-amber-300 rounded-xl p-4 bg-amber-50">
                  <p className="text-xs font-semibold text-amber-700 mb-3">✍️ تصویر امضا</p>
                  {sigPreview && (
                    <div className="mb-3 flex justify-center">
                      <img src={sigPreview} alt="امضا" className="max-h-20 border border-amber-200 rounded-lg p-2 bg-white" />
                    </div>
                  )}
                  <div className="text-center cursor-pointer" onClick={() => sigRef.current?.click()}>
                    <input ref={sigRef} type="file" accept="image/*" onChange={handleSigChange} className="hidden" />
                    <p className="text-amber-600 text-sm hover:text-amber-700 transition">
                      {sigPreview ? "تغییر تصویر امضا" : "آپلود تصویر امضا (PNG شفاف)"}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={formLoading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl transition disabled:opacity-50 font-medium text-sm">
                  {formLoading ? "صبر کنید..." : editingUser ? "ذخیره" : "ایجاد کاربر"}</button>
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 border-2 border-slate-200 rounded-xl hover:bg-slate-50 transition text-sm">انصراف</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
