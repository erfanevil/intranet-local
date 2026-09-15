"use client";
import { useEffect, useState } from "react";
import { authFetch, getToken } from "@/lib/client-auth";
import { formatShortDateFA } from "@/lib/date";

interface AFile {
  id: number; originalName: string; mimeType: string; size: number; createdAt: string;
  senderName: string; senderUsername: string;
}
interface AMsg {
  id: number; subject: string; body: string; attachmentOriginalName?: string;
  attachmentSize?: number; createdAt: string; senderName: string; senderPosition: string;
}

const fmtSize = (b: number) => b < 1024 ? b + " B" : b < 1048576 ? (b/1024).toFixed(1) + " KB" : (b/1048576).toFixed(1) + " MB";

export default function ArchivePage() {
  const [tab, setTab] = useState<"files"|"messages">("files");
  const [files, setFiles] = useState<AFile[]>([]);
  const [msgs, setMsgs] = useState<AMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const [fRes, mRes] = await Promise.all([
      authFetch("/api/files/archived"),
      authFetch("/api/messages/archived"),
    ]);
    setFiles((await fRes.json()).files || []);
    setMsgs((await mRes.json()).messages || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const restoreFile = async (id: number) => {
    const res = await authFetch(`/api/files/${id}/restore`, { method: "POST" });
    if (res.ok) setFiles(p => p.filter(f => f.id !== id));
  };

  const restoreMsg = async (id: number) => {
    const res = await authFetch(`/api/messages/${id}/restore`, { method: "POST" });
    if (res.ok) setMsgs(p => p.filter(m => m.id !== id));
  };

  const viewFile = (id: number) => window.open(`/api/files/${id}/view?token=${getToken()}`, "_blank");
  const dlFile = (id: number) => window.open(`/api/files/${id}/download?token=${getToken()}`, "_blank");
  const viewAttach = (id: number) => window.open(`/api/messages/${id}/attachment/view?token=${getToken()}`, "_blank");
  const dlAttach = (id: number) => window.open(`/api/messages/${id}/attachment?token=${getToken()}`, "_blank");

  const filteredFiles = files.filter(f =>
    f.originalName.toLowerCase().includes(search.toLowerCase()) ||
    f.senderName.includes(search)
  );
  const filteredMsgs = msgs.filter(m =>
    m.subject.includes(search) || m.body.includes(search) || m.senderName.includes(search)
  );

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">بایگانی</h1>
        <p className="text-slate-500 text-sm mt-1">موارد بایگانی‌شده شما — قابل بازگردانی</p>
      </div>

      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="flex gap-1 bg-slate-100 p-1.5 rounded-xl">
          <button onClick={() => setTab("files")} className={`px-5 py-2 rounded-lg text-sm font-medium transition ${tab === "files" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}>
            بایگانی فایل‌ها
            {files.length > 0 && <span className="mr-1.5 bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full text-xs">{files.length}</span>}
          </button>
          <button onClick={() => setTab("messages")} className={`px-5 py-2 rounded-lg text-sm font-medium transition ${tab === "messages" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}>
            بایگانی نامه‌ها
            {msgs.length > 0 && <span className="mr-1.5 bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full text-xs">{msgs.length}</span>}
          </button>
        </div>

        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <svg className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="جستجو..." className="w-full pr-10 pl-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50 focus:bg-white transition" />
          </div>
        </div>
      </div>

      {/* Files Archive */}
      {tab === "files" && (
        filteredFiles.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-16 text-center">
            <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V7a2 2 0 00-2-2H6a2 2 0 00-2 2v6m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4m4 0h8" /></svg>
            <h3 className="text-lg font-semibold text-slate-500">{search ? "نتیجه‌ای یافت نشد" : "بایگانی فایل خالی است"}</h3>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFiles.map(f => (
              <div key={f.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center gap-4 hover:shadow-md transition">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-800 text-sm truncate">{f.originalName}</h3>
                  <div className="text-xs text-slate-500 mt-1">از: {f.senderName} • {fmtSize(f.size)} • {formatShortDateFA(f.createdAt)}</div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button onClick={() => viewFile(f.id)} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium text-slate-700 transition">مشاهده</button>
                  <button onClick={() => dlFile(f.id)} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition">دانلود</button>
                  <button onClick={() => restoreFile(f.id)} className="px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs font-medium flex items-center gap-1 transition">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6-6m-6 6l6 6" /></svg>
                    بازگردانی
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Messages Archive */}
      {tab === "messages" && (
        filteredMsgs.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-16 text-center">
            <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V7a2 2 0 00-2-2H6a2 2 0 00-2 2v6m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4m4 0h8" /></svg>
            <h3 className="text-lg font-semibold text-slate-500">{search ? "نتیجه‌ای یافت نشد" : "بایگانی نامه خالی است"}</h3>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMsgs.map(m => (
              <div key={m.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center gap-4 hover:shadow-md transition">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-800 text-sm truncate">{m.subject}</h3>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{m.body}</p>
                  <div className="text-xs text-slate-400 mt-1">
                    از: {m.senderName} • {m.senderPosition} • {formatShortDateFA(m.createdAt)}
                    {m.attachmentOriginalName && <span> • 📎 {m.attachmentOriginalName}</span>}
                  </div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0 flex-wrap justify-end">
                  {m.attachmentOriginalName && (
                    <>
                      <button onClick={() => viewAttach(m.id)} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium text-slate-700 transition">مشاهده</button>
                      <button onClick={() => dlAttach(m.id)} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition">دانلود</button>
                    </>
                  )}
                  <button onClick={() => restoreMsg(m.id)} className="px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs font-medium flex items-center gap-1 transition">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6-6m-6 6l6 6" /></svg>
                    بازگردانی
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
