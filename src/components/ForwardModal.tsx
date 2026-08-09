"use client";
import { useEffect, useState } from "react";
import { authFetch } from "@/lib/client-auth";
import Avatar from "./Avatar";

interface User {
  id: number; username: string; displayName: string; position: string; avatar?: string;
}

interface Props {
  onClose: () => void;
  onForward: (userId: number) => Promise<void>;
}

export default function ForwardModal({ onClose, onForward }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState<number | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    authFetch("/api/users").then(r => r.json()).then(d => setUsers(d.users || []));
  }, []);

  const filtered = users.filter(u =>
    u.displayName.includes(search) || u.username.includes(search) || u.position.includes(search)
  );

  const handleForward = async (userId: number) => {
    setSending(userId);
    try {
      await onForward(userId);
      setDone(true);
      setTimeout(() => { setDone(false); onClose(); }, 1000);
    } catch {} finally { setSending(null); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-100 bg-slate-50 rounded-t-2xl">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
              ارجاع به
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="جستجوی نام یا سمت..."
            className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            autoFocus
          />
        </div>

        {done ? (
          <div className="flex-1 flex flex-col items-center justify-center p-10">
            <svg className="w-16 h-16 text-green-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <p className="text-green-700 font-bold">ارجاع شد!</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-center text-slate-400 py-10 text-sm">کاربری یافت نشد</p>
            ) : (
              filtered.map(u => (
                <button key={u.id} onClick={() => handleForward(u.id)} disabled={sending !== null}
                  className="w-full p-3.5 flex items-center gap-3 hover:bg-blue-50 transition border-b border-slate-50 disabled:opacity-50">
                  <Avatar avatar={u.avatar} name={u.displayName} size="md" />
                  <div className="flex-1 text-right min-w-0">
                    <h3 className="font-semibold text-slate-800 text-sm truncate">{u.displayName}</h3>
                    <p className="text-xs text-slate-500">{u.position}</p>
                  </div>
                  {sending === u.id ? (
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
