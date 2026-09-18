"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { authFetch, getUser } from "@/lib/client-auth";
import { formatChatTimeFA, timeAgo } from "@/lib/date";
import Avatar from "@/components/Avatar";

// Telegram-style read status ticks
function ReadTick({ isRead, light }: { isRead: boolean; light?: boolean }) {
  if (isRead) {
    return (
      <svg
        className={`w-4 h-4 ${light ? "text-cyan-300" : "text-sky-500"} drop-shadow-sm`}
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"
        aria-label="خوانده شده"
      >
        <title>خوانده شده</title>
        <path d="M18 6 7 17l-5-5" />
        <path d="m22 10-7.5 7.5L13 16" />
      </svg>
    );
  }
  return (
    <svg
      className={`w-4 h-4 ${light ? "text-blue-200/80" : "text-slate-300"}`}
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"
      aria-label="تحویل شده"
    >
      <title>تحویل شده — هنوز خوانده نشده</title>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

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
  const [selectedMessageId, setSelectedMessageId] = useState<number | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const currentUser = getUser();
  const selectedUserIdRef = useRef<number | null>(null);
  const prevMessageCountRef = useRef(0);
  const isFirstLoadRef = useRef(true);
  const userSentRef = useRef(false);

  useEffect(() => { selectedUserIdRef.current = selectedUserId; }, [selectedUserId]);

  const selectedUser = users.find(u => u.id === selectedUserId) || null;

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

  useEffect(() => {
    fetchSidebar();
    const interval = setInterval(fetchSidebar, 10000);
    return () => clearInterval(interval);
  }, [fetchSidebar]);

  // Reset on user change
  useEffect(() => {
    if (!selectedUserId) return;
    isFirstLoadRef.current = true;
    prevMessageCountRef.current = 0;
  }, [selectedUserId]);

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
        fetchSidebar();
      } catch {}
    };

    setLoadingMsgs(true);
    fetchMsgs();
    const interval = setInterval(fetchMsgs, 4000);

    return () => { cancelled = true; clearInterval(interval); };
  }, [selectedUserId, fetchSidebar]);

  // Smart scroll: only scroll to bottom on first load, new messages, or user sent
  useEffect(() => {
    const currentCount = messages.length;
    const prevCount = prevMessageCountRef.current;

    if (isFirstLoadRef.current && currentCount > 0) {
      // First load — jump to bottom instantly
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      isFirstLoadRef.current = false;
    } else if (userSentRef.current) {
      // User just sent a message — scroll to bottom
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      userSentRef.current = false;
    } else if (currentCount > prevCount && prevCount > 0) {
      // New message arrived from other person — only scroll if already near bottom
      const container = chatContainerRef.current;
      if (container) {
        const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
        if (distanceFromBottom < 150) {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
      }
    }

    prevMessageCountRef.current = currentCount;
  }, [messages]);

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const maxHeight = 150;
      textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + "px";
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [newMessage]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !selectedUserId) return;
    const msg = newMessage;
    setNewMessage("");
    setSending(true);
    userSentRef.current = true;
    try {
      await authFetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, receiverId: selectedUserId }),
      });
      const res = await authFetch(`/api/chats?userId=${selectedUserId}`);
      const data = await res.json();
      setMessages(data.chats || []);
    } catch {} finally { setSending(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDeleteMessage = async (msgId: number) => {
    if (!confirm("آیا از حذف این پیام مطمئن هستید؟")) return;
    try {
      const res = await authFetch(`/api/chats/${msgId}`, { method: "DELETE" });
      if (res.ok) {
        setMessages(prev => prev.filter(m => m.id !== msgId));
        setSelectedMessageId(null);
      }
    } catch {}
  };

  const handleStartEdit = (msg: ChatMessage) => {
    setEditingMessageId(msg.id);
    setEditText(msg.message);
    setSelectedMessageId(null);
  };

  const handleSaveEdit = async () => {
    if (!editingMessageId || !editText.trim()) return;
    try {
      const res = await authFetch(`/api/chats/${editingMessageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: editText }),
      });
      if (res.ok) {
        setMessages(prev => prev.map(m => m.id === editingMessageId ? { ...m, message: editText } : m));
        setEditingMessageId(null);
        setEditText("");
      }
    } catch {}
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditText("");
  };

  const getOnlineStatus = (u: User) => {
    if (u.isOnline) return { text: "آنلاین", color: "text-green-600" };
    if (u.lastSeen) return { text: `آخرین بازدید: ${timeAgo(u.lastSeen)}`, color: "text-slate-400" };
    return { text: "آفلاین", color: "text-slate-400" };
  };

  useEffect(() => {
    const handleClickOutside = () => {
      if (selectedMessageId !== null) setSelectedMessageId(null);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [selectedMessageId]);

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
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 chat-bg">
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
                  const isEditing = editingMessageId === msg.id;
                  const isSelected = selectedMessageId === msg.id;
                  
                  return (
                    <div key={msg.id} className={`flex ${isMe ? "justify-start" : "justify-end"}`}>
                      <div className="relative group max-w-[75%]">
                        {isEditing ? (
                          <div className={`min-w-[200px] px-4 py-2.5 rounded-2xl ${isMe ? "bg-blue-600 rounded-br-md" : "bg-white rounded-bl-md shadow-sm border border-slate-100"}`}>
                            <textarea
                              value={editText}
                              onChange={e => setEditText(e.target.value)}
                              className={`w-full bg-transparent text-sm leading-relaxed resize-none outline-none ${isMe ? "text-white placeholder-blue-200" : "text-slate-800"}`}
                              rows={3}
                              autoFocus
                            />
                            <div className="flex gap-2 mt-2 justify-end">
                              <button onClick={handleCancelEdit} className={`text-xs px-2 py-1 rounded ${isMe ? "text-blue-200 hover:text-white" : "text-slate-400 hover:text-slate-600"}`}>انصراف</button>
                              <button onClick={handleSaveEdit} className={`text-xs px-2 py-1 rounded ${isMe ? "bg-white/20 text-white hover:bg-white/30" : "bg-blue-500 text-white hover:bg-blue-600"}`}>ذخیره</button>
                            </div>
                          </div>
                        ) : (
                          <div
                            onClick={(e) => {
                              if (isMe) {
                                e.stopPropagation();
                                setSelectedMessageId(isSelected ? null : msg.id);
                              }
                            }}
                            className={`px-4 py-2.5 rounded-2xl ${isMe ? "bg-blue-600 text-white rounded-br-md cursor-pointer hover:bg-blue-700" : "bg-white text-slate-800 rounded-bl-md shadow-sm border border-slate-100"} transition`}
                          >
                            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.message}</p>
                            <div className="flex items-center gap-1 mt-1.5 justify-end">
                              <span className={`text-[11px] leading-none ${isMe ? "text-blue-200" : "text-slate-400"}`} title={isMe ? (msg.isRead ? "خوانده شده" : "تحویل شده") : undefined}>{formatChatTimeFA(msg.createdAt)}</span>
                              {isMe && <ReadTick isRead={msg.isRead} light />}
                            </div>
                          </div>
                        )}
                        
                        {/* Action Menu for own messages */}
                        {isMe && isSelected && !isEditing && (
                          <div 
                            className="absolute top-0 right-full mr-2 bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden z-10"
                            onClick={e => e.stopPropagation()}
                          >
                            <button
                              onClick={() => handleStartEdit(msg)}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full transition whitespace-nowrap"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              ویرایش
                            </button>
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full transition whitespace-nowrap"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              حذف
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}<div ref={messagesEndRef} /></>
              )}
            </div>
            <form onSubmit={handleSend} className="p-4 border-t border-slate-100 bg-white">
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <textarea
                    ref={textareaRef}
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="پیام خود را بنویسید..."
                    rows={1}
                    className="w-full px-4 py-3 bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none overflow-y-auto leading-relaxed"
                    style={{ minHeight: "48px", maxHeight: "150px" }}
                  />
                </div>
                <button type="submit" disabled={sending || !newMessage.trim()} className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition disabled:opacity-50 flex-shrink-0 h-12 flex items-center justify-center">
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
