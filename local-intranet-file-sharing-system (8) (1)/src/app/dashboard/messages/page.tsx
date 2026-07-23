"use client";
import { useEffect, useState } from "react";
import { authFetch, getToken } from "@/lib/client-auth";
import { formatShortDateFA } from "@/lib/date";
import ForwardModal from "@/components/ForwardModal";

interface Msg {
  id: number; subject: string; body: string; attachmentFilename?: string; attachmentOriginalName?: string;
  attachmentSize?: number; isRead: boolean; createdAt: string;
  senderName?: string; senderPosition?: string; senderUsername?: string;
  receiverName?: string; receiverPosition?: string;
}
const fmtSize = (b: number) => b < 1024 ? b + " B" : b < 1048576 ? (b/1024).toFixed(1) + " KB" : (b/1048576).toFixed(1) + " MB";

export default function MessagesPage() {
  const [tab, setTab] = useState<"received"|"sent">("received");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<Msg|null>(null);
  const [forwardMsgId, setForwardMsgId] = useState<number | null>(null);

  const load = async () => { setLoading(true); const r = await authFetch(tab === "sent" ? "/api/messages/sent" : "/api/messages"); const d = await r.json(); setMsgs(d.messages || []); setLoading(false); };
  useEffect(() => { load(); }, [tab]);

  const openMsg = async (m: Msg) => { setSel(m); if (!m.isRead && tab === "received") { await authFetch(`/api/messages/${m.id}/read`, { method: "PATCH" }); setMsgs(p => p.map(x => x.id === m.id ? { ...x, isRead: true } : x)); } };
  const dlAttach = (m: Msg) => window.open(`/api/messages/${m.id}/attachment?token=${getToken()}`, "_blank");
  const openWordClient = (absoluteUrl: string) => {
    const officeUrl = `ms-word:ofe|u|${absoluteUrl}`;
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = officeUrl;
    document.body.appendChild(iframe);
    setTimeout(() => iframe.remove(), 2000);
  };
  const viewAttach = (m: Msg) => {
    const viewUrl = `/api/messages/${m.id}/attachment/view?token=${getToken()}`;
    const absoluteUrl = `${window.location.origin}${viewUrl}`;
    const lowerName = (m.attachmentOriginalName || "").toLowerCase();
    const isWord = lowerName.endsWith(".doc") || lowerName.endsWith(".docx");
    if (isWord) {
      openWordClient(absoluteUrl);
    } else {
      window.open(viewUrl, "_blank");
    }
  };
  const delMsg = async (m: Msg, e?: React.MouseEvent) => { e?.stopPropagation(); if (!confirm(`نامه "${m.subject}" به بایگانی منتقل شود؟`)) return; const r = await authFetch(`/api/messages/${m.id}`, { method: "DELETE" }); if (r.ok) { setMsgs(p => p.filter(x => x.id !== m.id)); if (sel?.id === m.id) setSel(null); } };

  const handleForward = async (userId: number) => {
    if (!forwardMsgId) return;
    const res = await authFetch(`/api/messages/${forwardMsgId}/forward`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ receiverId: userId }),
    });
    if (!res.ok) throw new Error("خطا");
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">نامه‌ها</h1>
        {tab === "received" && msgs.filter(m => !m.isRead).length > 0 && (
          <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded-xl text-sm font-medium">{msgs.filter(m => !m.isRead).length} خوانده نشده</div>
        )}
      </div>
      <div className="flex gap-1 bg-slate-100 p-1.5 rounded-xl w-fit mb-6">
        <button onClick={() => setTab("received")} className={`px-5 py-2 rounded-lg text-sm font-medium transition ${tab === "received" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}>📥 دریافتی</button>
        <button onClick={() => setTab("sent")} className={`px-5 py-2 rounded-lg text-sm font-medium transition ${tab === "sent" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}>📤 ارسالی</button>
      </div>

      {forwardMsgId && <ForwardModal onClose={() => setForwardMsgId(null)} onForward={handleForward} />}

      {/* Detail Modal */}
      {sel && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSel(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
              <h2 className="text-base font-bold text-slate-800 truncate pr-4">{sel.subject}</h2>
              <div className="flex items-center gap-1.5">
                <button onClick={() => { setSel(null); setForwardMsgId(sel.id); }} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="ارجاع">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                </button>
                <button onClick={() => delMsg(sel)} className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg" title="بایگانی نامه">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
                <button onClick={() => setSel(null)} className="p-2 hover:bg-slate-200 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            <div className="p-5 overflow-y-auto max-h-[calc(85vh-80px)]">
              <div className="flex items-center gap-3 mb-5 pb-5 border-b border-slate-100">
                <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center text-white font-bold">
                  {(tab === "received" ? (sel.senderName || "?") : (sel.receiverName || "?")).charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{tab === "received" ? sel.senderName : `به: ${sel.receiverName}`}</p>
                  <p className="text-xs text-blue-600">{tab === "received" ? sel.senderPosition : sel.receiverPosition}</p>
                  <p className="text-xs text-slate-400">{formatShortDateFA(sel.createdAt)}</p>
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-5 whitespace-pre-wrap text-slate-700 leading-relaxed text-sm mb-4">{sel.body}</div>
              {sel.attachmentOriginalName && (
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4">
                  <p className="text-sm font-medium text-slate-600 mb-3 flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                    پیوست
                  </p>
                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                    <div className="flex items-center gap-3 min-w-0"><span className="text-2xl">📄</span><div className="min-w-0"><p className="font-medium text-slate-800 text-sm truncate">{sel.attachmentOriginalName}</p><p className="text-xs text-slate-500">{fmtSize(sel.attachmentSize || 0)}</p></div></div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button onClick={() => viewAttach(sel)} className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        مشاهده
                      </button>
                      <button onClick={() => dlAttach(sel)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        دانلود
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {msgs.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-16 text-center">
          <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          <h3 className="text-lg font-semibold text-slate-500">{tab === "received" ? "نامه‌ای دریافت نشده" : "نامه‌ای ارسال نشده"}</h3>
        </div>
      ) : (
        <div className="space-y-3">
          {msgs.map(m => (
            <div key={m.id} className={`bg-white rounded-xl shadow-sm border p-4 flex items-center gap-3 hover:shadow-md transition ${!m.isRead && tab === "received" ? "border-blue-300 bg-blue-50/30" : "border-slate-200"}`}>
              <button onClick={() => openMsg(m)} className="flex-1 flex items-start gap-3 text-right min-w-0">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0 text-sm">
                  {(tab === "received" ? (m.senderName || "?") : (m.receiverName || "?")).charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className={`truncate text-sm ${!m.isRead && tab === "received" ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}>{m.subject}</h3>
                    {!m.isRead && tab === "received" && <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">جدید</span>}
                    {m.attachmentOriginalName && <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>}
                  </div>
                  <p className="text-xs text-slate-500 truncate">{m.body}</p>
                  <div className="text-xs text-slate-400 mt-1">
                    {tab === "received" ? <span>{m.senderName}</span> : <span>به: {m.receiverName}</span>}
                    <span> • {formatShortDateFA(m.createdAt)}</span>
                  </div>
                </div>
              </button>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => setForwardMsgId(m.id)} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg transition" title="ارجاع">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                </button>
                <button onClick={e => delMsg(m, e)} className="p-1.5 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition" title="بایگانی">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
