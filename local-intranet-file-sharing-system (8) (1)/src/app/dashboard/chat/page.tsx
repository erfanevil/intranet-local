"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { authFetch, getUser } from "@/lib/client-auth";
import { formatTimeFA, timeAgo } from "@/lib/date";
import Avatar from "@/components/Avatar";

interface User {
  id: number; username: string; displayName: string; position: string;
  avatar?: string; isOnline?: boolean; lastSeen?: string;
}
interface ChatMessage {
  id: number; message: string; senderId: number; receiverId: number;
  isRead: boolean; createdAt: string;
}

export default function ChatPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<number, number>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUser = getUser();
  const selectedUserIdRef = useRef<number | null>(null);

  // Keep ref in sync
  useEffect(() => { selectedUserIdRef.current = selectedUserId; }, [selectedUserId]);

  const selectedUser = users.find(u => u.id === selectedUserId) || null;

  // Fetch users list + unread counts (no dependency on selectedUser)
  const fetchSidebar = useCallback(async () => {
    try {
      const [usersRes, unreadRes] = await Promise.all([
        authFetch("/api/online"),
        authFetch("/api/chats/unread-per-user"),
      ]);
      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users || []);
      }
      if (unreadRes.ok) {
        const data = await unreadRes.json();
        setUnreadCounts(data.unread || {});
      }
    } catch {}
  }, []);

  // Initial load + poll sidebar every 10s
  useEffect(() => {
    fetchSidebar();
    const interval = setInterval(fetchSidebar, 10000);
    return () => clearInterval(interval);
  }, [fetchSidebar]);

  // Fetch chat messages for selected user
  useEffect(() => {
    if (!selectedUserId) return;

    let cancelled = false;

    const fetchMsgs = async () => {
      try {
        const res = await authFetch(`/api/chats?userId=${selectedUserId}`);
        if (cancelled) return;
        const data = await res.json();
        setMessages(data.chats || []);
        setLoadingMsgs(false);
        // Refresh unread after reading
        fetchSidebar();
      } catch {}
    };

    setLoadingMsgs(true);
    fetchMsgs();
    const interval = setInterval(fetchMsgs, 4000);

    return () => { cancelled = true; clearInterval(interval); };
  }, [selectedUserId, fetchSidebar]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUserId) return;
    const msg = newMessage;
    setNewMessage("");
    setSending(true);
    try {
      await authFetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, receiverId: selectedUserId }),
      });
      // Fetch updated messages
      const res = await authFetch(`/api/chats?userId=${selectedUserId}`);
      const data = await res.json();
      setMessages(data.chats || []);
    } catch {} finally { setSending(false); }
  };

  const getOnlineStatus = (u: User) => {
    if (u.isOnline) return { text: "آنلاین", color: "text-green-600" };
    if (u.lastSeen) return { text: `آخرین بازدید: ${timeAgo(u.lastSeen)}`, color: "text-slate-400" };
    return { text: "آفلاین", color: "text-slate-400" };
  };

  return (
    <div className="h-[calc(100vh-180px)] flex bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Users List */}
      <div className={`w-80 border-l border-slate-200 flex flex-col ${selectedUserId ? "hidden md:flex" : "flex w-full md:w-80"}`}>
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            پیام‌رسان
          </h2>
          <p className="text-xs text-slate-500 mt-1">{users.filter(u => u.isOnline).length} نفر آنلاین</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {users.map(user => {
            const unread = unreadCounts[user.id] || 0;
            const status = getOnlineStatus(user);
            return (
              <button key={user.id} onClick={() => setSelectedUserId(user.id)}
                className={`w-full p-3 flex items-center gap-3 hover:bg-slate-50 transition border-b border-slate-50 ${selectedUserId === user.id ? "bg-blue-50" : ""}`}>
                <Avatar avatar={user.avatar} name={user.displayName} size="md" isOnline={user.isOnline} />
                <div className="flex-1 text-right min-w-0">
                  <h3 className={`text-sm truncate ${unread > 0 ? "font-bold text-slate-900" : "font-semibold text-slate-800"}`}>{user.displayName}</h3>
                  <p className={`text-xs truncate ${status.color}`}>{status.text}</p>
                </div>
                {unread > 0 && (
                  <span className="min-w-[22px] h-[22px] flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full px-1.5">{unread > 99 ? "99+" : unread}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col ${!selectedUserId ? "hidden md:flex" : "flex"}`}>
        {selectedUser ? (
          <>
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
              <button onClick={() => setSelectedUserId(null)} className="md:hidden p-2 hover:bg-slate-200 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
              <Avatar avatar={selectedUser.avatar} name={selectedUser.displayName} size="md" isOnline={selectedUser.isOnline} />
              <div>
                <h3 className="font-semibold text-slate-800">{selectedUser.displayName}</h3>
                <p className={`text-xs ${getOnlineStatus(selectedUser).color}`}>{getOnlineStatus(selectedUser).text}</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 chat-bg">
              {loadingMsgs && messages.length === 0 ? (
                <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  <p>اولین پیام رو بفرست!</p>
                </div>
              ) : (
                <>{messages.map(msg => {
                  const isMe = msg.senderId === currentUser?.id;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? "justify-start" : "justify-end"}`}>
                      <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl ${isMe ? "bg-blue-600 text-white rounded-br-md" : "bg-white text-slate-800 rounded-bl-md shadow-sm"}`}>
                        <p className="text-sm leading-relaxed">{msg.message}</p>
                        <p className={`text-xs mt-1 ${isMe ? "text-blue-200" : "text-slate-400"}`}>{formatTimeFA(msg.createdAt)}</p>
                      </div>
                    </div>
                  );
                })}<div ref={messagesEndRef} /></>
              )}
            </div>
            <form onSubmit={handleSend} className="p-4 border-t border-slate-100 bg-white">
              <div className="flex gap-3">
                <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="پیام..." className="flex-1 px-4 py-3 bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button type="submit" disabled={sending || !newMessage.trim()} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition disabled:opacity-50">
                  {sending ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <svg className="w-5 h-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <svg className="w-24 h-24 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            <p className="text-lg">یک مخاطب انتخاب کنید</p>
          </div>
        )}
      </div>
    </div>
  );
}
