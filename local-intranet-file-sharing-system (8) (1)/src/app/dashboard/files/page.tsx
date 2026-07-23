"use client";
import { useEffect, useState } from "react";
import { authFetch, getToken } from "@/lib/client-auth";
import { formatShortDateFA } from "@/lib/date";
import ForwardModal from "@/components/ForwardModal";

interface F {
  id: number; originalName: string; mimeType: string; size: number; isRead: boolean; createdAt: string;
  senderName?: string; senderUsername?: string; receiverName?: string; receiverUsername?: string;
}

const fmtSize = (b: number) => b < 1024 ? b + " B" : b < 1048576 ? (b/1024).toFixed(1) + " KB" : (b/1048576).toFixed(1) + " MB";
const getIcon = (m: string): { icon: string; bg: string } => {
  if (m.startsWith("image/")) return { icon: "🖼️", bg: "bg-pink-100" };
  if (m.includes("pdf")) return { icon: "📄", bg: "bg-red-100" };
  if (m.includes("word") || m.includes("document")) return { icon: "📝", bg: "bg-blue-100" };
  if (m.includes("sheet") || m.includes("excel")) return { icon: "📊", bg: "bg-green-100" };
  if (m.includes("zip") || m.includes("rar")) return { icon: "📦", bg: "bg-amber-100" };
  return { icon: "📎", bg: "bg-slate-100" };
};

export default function FilesPage() {
  const [tab, setTab] = useState<"received"|"sent">("received");
  const [files, setFiles] = useState<F[]>([]);
  const [loading, setLoading] = useState(true);
  const [forwardFileId, setForwardFileId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await authFetch(tab === "sent" ? "/api/files/sent" : "/api/files");
    const data = await res.json(); setFiles(data.files || []); setLoading(false);
  };
  useEffect(() => { load(); }, [tab]);

  const dl = (f: F) => { window.open(`/api/files/${f.id}/download?token=${getToken()}`, "_blank"); markRead(f); };
  const markRead = (f: F) => { if (tab === "received") setFiles(p => p.map(x => x.id === f.id ? { ...x, isRead: true } : x)); };
  const openWordClient = (absoluteUrl: string) => {
    const officeUrl = `ms-word:ofe|u|${absoluteUrl}`;
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = officeUrl;
    document.body.appendChild(iframe);
    setTimeout(() => iframe.remove(), 2000);
  };
  const view = (f: F) => {
    const viewUrl = `/api/files/${f.id}/view?token=${getToken()}`;
    const absoluteUrl = `${window.location.origin}${viewUrl}`;
    const lowerName = f.originalName.toLowerCase();
    const isWord = lowerName.endsWith(".doc") || lowerName.endsWith(".docx") || f.mimeType.includes("word") || f.mimeType.includes("document");
    if (isWord) {
      openWordClient(absoluteUrl);
    } else {
      window.open(viewUrl, "_blank");
    }
    markRead(f);
  };
  const del = async (f: F) => { if (!confirm(`فایل "${f.originalName}" به بایگانی منتقل شود؟`)) return; const r = await authFetch(`/api/files/${f.id}`, { method: "DELETE" }); if (r.ok) setFiles(p => p.filter(x => x.id !== f.id)); };

  const handleForward = async (userId: number) => {
    if (!forwardFileId) return;
    const res = await authFetch(`/api/files/${forwardFileId}/forward`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ receiverId: userId }),
    });
    if (!res.ok) throw new Error("خطا");
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">فایل‌ها</h1>
        {tab === "received" && files.filter(f => !f.isRead).length > 0 && (
          <div className="bg-amber-100 text-amber-700 px-4 py-2 rounded-xl text-sm font-medium">{files.filter(f => !f.isRead).length} خوانده نشده</div>
        )}
      </div>
      <div className="flex gap-1 bg-slate-100 p-1.5 rounded-xl w-fit mb-6">
        <button onClick={() => setTab("received")} className={`px-5 py-2 rounded-lg text-sm font-medium transition ${tab === "received" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}>📥 دریافتی</button>
        <button onClick={() => setTab("sent")} className={`px-5 py-2 rounded-lg text-sm font-medium transition ${tab === "sent" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}>📤 ارسالی</button>
      </div>

      {forwardFileId && <ForwardModal onClose={() => setForwardFileId(null)} onForward={handleForward} />}

      {files.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-16 text-center">
          <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
          <h3 className="text-lg font-semibold text-slate-500">{tab === "received" ? "فایلی دریافت نشده" : "فایلی ارسال نشده"}</h3>
        </div>
      ) : (
        <div className="grid gap-3">
          {files.map(f => {
            const { icon, bg } = getIcon(f.mimeType);
            return (
              <div key={f.id} className={`bg-white rounded-xl shadow-sm border p-4 flex items-center gap-4 hover:shadow-md transition ${!f.isRead && tab === "received" ? "border-blue-300 bg-blue-50/30" : "border-slate-200"}`}>
                <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center text-xl flex-shrink-0`}>{icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-semibold text-slate-800 truncate text-sm">{f.originalName}</h3>
                    {!f.isRead && tab === "received" && <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">جدید</span>}
                  </div>
                  <div className="text-xs text-slate-500">
                    {tab === "received" ? <span>از: {f.senderName}</span> : <span>به: {f.receiverName}</span>}
                    <span> • {fmtSize(f.size)} • {formatShortDateFA(f.createdAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 flex-wrap justify-end">
                  <button onClick={() => view(f)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition" title="مشاهده">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    مشاهده
                  </button>
                  <button onClick={() => dl(f)} className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition" title="دانلود">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    دانلود
                  </button>
                  <button onClick={() => setForwardFileId(f.id)} className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition" title="ارجاع">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                    ارجاع
                  </button>
                  <button onClick={() => del(f)} className="p-1.5 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition" title="بایگانی">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
