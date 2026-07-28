"use client";

import { useEffect, useState, useRef } from "react";
import { authFetch, getToken } from "@/lib/client-auth";

interface User { id: number; username: string; displayName: string; position: string; }

const fmtSize = (b: number) => b < 1024 ? b + " B" : b < 1048576 ? (b/1024).toFixed(1) + " KB" : (b/1048576).toFixed(1) + " MB";

export default function SendPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [signers, setSigners] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<"message" | "file" | "signature">("message");
  const [selectedUser, setSelectedUser] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [subject, setSubject] = useState(""); const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const attachmentRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null); const fileInputRef = useRef<HTMLInputElement>(null);
  const [sigDoc, setSigDoc] = useState<File | null>(null); const [sigDesc, setSigDesc] = useState(""); const sigDocRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    authFetch("/api/users").then(r => r.json()).then(d => setUsers(d.users || []));
    authFetch("/api/signers").then(r => r.json()).then(d => setSigners(d.signers || []));
  }, []);

  const handleAddAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles = Array.from(files);
    setAttachments(prev => {
      const combined = [...prev, ...newFiles];
      return combined.slice(0, 5); // Max 5
    });
    if (attachmentRef.current) attachmentRef.current.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selectedUser) { setError("گیرنده را انتخاب کنید"); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      const fd = new FormData();
      fd.append("subject", subject);
      fd.append("body", body);
      fd.append("receiverId", selectedUser);
      
      // First attachment goes to legacy field
      if (attachments.length > 0) fd.append("attachment", attachments[0]);
      // Extra attachments (up to 4 more)
      for (let i = 1; i < attachments.length && i <= 4; i++) {
        fd.append(`attachment_${i}`, attachments[i]);
      }

      const res = await fetch("/api/messages", { method: "POST", headers: { Authorization: `Bearer ${getToken()}` }, body: fd });
      if (!res.ok) throw new Error((await res.json()).error);
      setSuccess("✅ نامه ارسال شد"); setSubject(""); setBody(""); setAttachments([]); setSelectedUser("");
    } catch (err) { setError(err instanceof Error ? err.message : "خطا"); } finally { setLoading(false); }
  };

  const handleSendFile = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selectedUser) { setError("گیرنده را انتخاب کنید"); return; }
    if (!file) { setError("فایل را انتخاب کنید"); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      const fd = new FormData(); fd.append("file", file); fd.append("receiverId", selectedUser);
      const res = await fetch("/api/files", { method: "POST", headers: { Authorization: `Bearer ${getToken()}` }, body: fd });
      if (!res.ok) throw new Error((await res.json()).error);
      setSuccess("✅ فایل ارسال شد"); setFile(null); setSelectedUser("");
    } catch (err) { setError(err instanceof Error ? err.message : "خطا"); } finally { setLoading(false); }
  };

  const handleSignRequest = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selectedUser) { setError("امضاکننده را انتخاب کنید"); return; }
    if (!sigDoc) { setError("سند را آپلود کنید"); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      const fd = new FormData(); fd.append("document", sigDoc); fd.append("signerId", selectedUser); fd.append("description", sigDesc);
      const res = await fetch("/api/sign-requests", { method: "POST", headers: { Authorization: `Bearer ${getToken()}` }, body: fd });
      if (!res.ok) throw new Error((await res.json()).error);
      setSuccess("✅ درخواست امضا ارسال شد"); setSigDoc(null); setSigDesc(""); setSelectedUser("");
    } catch (err) { setError(err instanceof Error ? err.message : "خطا"); } finally { setLoading(false); }
  };

  const currentUsers = activeTab === "signature" ? signers : users;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6"><h1 className="text-2xl font-bold text-slate-800">ارسال جدید</h1><p className="text-slate-500 mt-1 text-sm">نامه، فایل یا درخواست امضا</p></div>

      <div className="flex gap-1 bg-slate-100 p-1.5 rounded-xl w-fit mb-6 flex-wrap">
        {([["message","📨 نامه"],["file","📁 فایل"],["signature","✍️ درخواست امضا"]] as const).map(([k,l]) => (
          <button key={k} onClick={() => { setActiveTab(k); setError(""); setSuccess(""); setSelectedUser(""); }}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition ${activeTab === k ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}>{l}</button>
        ))}
      </div>

      {success && <div className="bg-green-50 border-r-4 border-green-500 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">{success}</div>}
      {error && <div className="bg-red-50 border-r-4 border-red-500 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="mb-5">
          <label className="block text-sm font-semibold text-slate-700 mb-2">{activeTab === "signature" ? "امضاکننده" : "گیرنده"}</label>
          {currentUsers.length === 0 ? (
            <div className="bg-amber-50 text-amber-700 px-4 py-3 rounded-xl text-sm">{activeTab === "signature" ? "هیچ کاربری قابلیت امضا ندارد." : "کاربری یافت نشد"}</div>
          ) : (
            <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-slate-50 focus:bg-white text-sm">
              <option value="">-- انتخاب --</option>
              {currentUsers.map((u) => <option key={u.id} value={u.id}>{u.displayName} - {u.position}</option>)}
            </select>
          )}
        </div>

        {activeTab === "message" && (
          <form onSubmit={handleSendMessage} className="space-y-4">
            <div><label className="block text-sm font-semibold text-slate-700 mb-1">موضوع</label><input type="text" value={subject} onChange={e => setSubject(e.target.value)} required className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" placeholder="موضوع نامه" /></div>
            <div><label className="block text-sm font-semibold text-slate-700 mb-1">متن</label><textarea value={body} onChange={e => setBody(e.target.value)} required rows={5} className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition resize-none" placeholder="متن نامه..." /></div>
            
            {/* Attachments section - up to 5 */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                پیوست‌ها
                <span className="text-slate-400 font-normal mr-2">({attachments.length}/۵)</span>
              </label>

              {attachments.length > 0 && (
                <div className="space-y-2 mb-3">
                  {attachments.map((file, i) => (
                    <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-2.5">
                      <span className="text-lg">📎</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                        <p className="text-xs text-slate-400">{fmtSize(file.size)}</p>
                      </div>
                      <button type="button" onClick={() => removeAttachment(i)} className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {attachments.length < 5 && (
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 bg-slate-50 text-sm transition" onClick={() => attachmentRef.current?.click()}>
                  <input ref={attachmentRef} type="file" multiple onChange={handleAddAttachment} className="hidden" />
                  <p className="text-slate-400">
                    <span className="text-lg ml-1">+</span>
                    افزودن پیوست {attachments.length > 0 ? "دیگر" : ""}
                  </p>
                </div>
              )}
            </div>

            <button type="submit" disabled={loading} className="w-full bg-gradient-to-l from-blue-600 to-blue-700 text-white font-semibold py-3.5 rounded-xl transition disabled:opacity-50 shadow-lg shadow-blue-500/25 text-sm">{loading ? "ارسال..." : "ارسال نامه"}</button>
          </form>
        )}

        {activeTab === "file" && (
          <form onSubmit={handleSendFile} className="space-y-4">
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 bg-slate-50" onClick={() => fileInputRef.current?.click()}>
              <input ref={fileInputRef} type="file" onChange={e => setFile(e.target.files?.[0] || null)} className="hidden" />
              {file ? <div><span className="text-3xl block mb-2">📄</span><p className="font-medium text-slate-700 text-sm">{file.name}</p></div> : <div><span className="text-4xl block mb-2">📁</span><p className="text-slate-500 text-sm">کلیک برای انتخاب فایل</p></div>}
            </div>
            <button type="submit" disabled={loading} className="w-full bg-gradient-to-l from-blue-600 to-blue-700 text-white font-semibold py-3.5 rounded-xl transition disabled:opacity-50 shadow-lg shadow-blue-500/25 text-sm">{loading ? "آپلود..." : "ارسال فایل"}</button>
          </form>
        )}

        {activeTab === "signature" && (
          <form onSubmit={handleSignRequest} className="space-y-4">
            <div><label className="block text-sm font-semibold text-slate-700 mb-1">توضیحات (اختیاری)</label><input type="text" value={sigDesc} onChange={e => setSigDesc(e.target.value)} className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" placeholder="مثلاً: نامه شماره ۱۲۳" /></div>
            <div><label className="block text-sm font-semibold text-slate-700 mb-1">آپلود نامه/سند</label>
              <div className="border-2 border-dashed border-amber-300 rounded-xl p-8 text-center cursor-pointer hover:border-amber-500 bg-amber-50" onClick={() => sigDocRef.current?.click()}>
                <input ref={sigDocRef} type="file" accept="image/*,.pdf" onChange={e => setSigDoc(e.target.files?.[0] || null)} className="hidden" />
                {sigDoc ? <div><span className="text-3xl block mb-2">📋</span><p className="font-medium text-slate-700 text-sm">{sigDoc.name}</p></div> : <div><span className="text-4xl block mb-2">✍️</span><p className="text-slate-600 text-sm font-medium">نامه‌ای که نیاز به امضا دارد</p><p className="text-xs text-slate-400 mt-1">فقط فایل تصویری یا PDF</p></div>}
              </div></div>
            <button type="submit" disabled={loading} className="w-full bg-gradient-to-l from-amber-500 to-amber-600 text-white font-semibold py-3.5 rounded-xl transition disabled:opacity-50 shadow-lg shadow-amber-500/25 text-sm">{loading ? "ارسال..." : "✍️ ارسال درخواست امضا"}</button>
          </form>
        )}
      </div>
    </div>
  );
}
