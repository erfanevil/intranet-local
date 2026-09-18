"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BotMessageSquare,
  Send,
  Square,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Trash2,
  AlertTriangle,
  Plus,
  User,
  Code2,
} from "lucide-react";
import { authFetch } from "@/lib/client-auth";

interface Msg {
  role: "user" | "assistant";
  content: string;
  time: number;
  error?: boolean;
}

const STORAGE_KEY = "ai_chat_history_v1";

const SUGGESTIONS = [
  "متن یک نامه رسمی برای درخواست اعتبار عمرانی بنویس",
  "یک بخش‌نامه داخلی درباره نظم اداری تنظیم کن",
  "چک‌لیست مدارک لازم برای صدور پروانه ساخت را فهرست کن",
  "متن زیر را به زبان اداری رسمی بازنویسی کن:",
];

/* ---------- lightweight markdown renderer ---------- */

function renderInline(line: string, prefix: string): ReactNode[] {
  const tokens = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return tokens.map((t, j) => {
    if (t.startsWith("**") && t.endsWith("**") && t.length > 4) {
      return <strong key={`${prefix}-${j}`} className="font-bold text-white">{t.slice(2, -2)}</strong>;
    }
    if (t.startsWith("`") && t.endsWith("`") && t.length > 2) {
      return (
        <code key={`${prefix}-${j}`} dir="ltr" className="bg-white/10 text-cyan-300 rounded px-1.5 py-0.5 text-[0.85em] font-mono">
          {t.slice(1, -1)}
        </code>
      );
    }
    return <span key={`${prefix}-${j}`}>{t}</span>;
  });
}

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="my-3 rounded-xl overflow-hidden border border-white/10 bg-black/40" dir="ltr">
      <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 border-b border-white/10">
        <span className="text-[10px] text-slate-400 font-mono uppercase flex items-center gap-1.5">
          <Code2 className="w-3 h-3" /> {lang || "code"}
        </span>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(code).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 transition"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          {copied ? "copied" : "copy"}
        </button>
      </div>
      <pre className="p-3 text-[12px] leading-5 text-slate-200 overflow-x-auto font-mono whitespace-pre-wrap">{code}</pre>
    </div>
  );
}

function Markdown({ text }: { text: string }) {
  const nodes: ReactNode[] = [];
  const segments = text.split("```");
  segments.forEach((seg, i) => {
    if (i % 2 === 1) {
      const nl = seg.indexOf("\n");
      const lang = nl === -1 ? seg : seg.slice(0, nl).trim();
      const code = nl === -1 ? "" : seg.slice(nl + 1).replace(/\n$/, "");
      nodes.push(<CodeBlock key={`code-${i}`} code={code} lang={lang} />);
      return;
    }
    const lines = seg.split("\n");
    let list: { ordered: boolean; items: string[] } | null = null;
    const flushList = (key: string) => {
      if (!list) return;
      const items = list.items;
      nodes.push(
        <ul key={key} className="my-2 space-y-1.5">
          {items.map((it, k) => (
            <li key={k} className="flex items-start gap-2">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
              <span>{renderInline(it, `${key}-${k}`)}</span>
            </li>
          ))}
        </ul>
      );
      list = null;
    };
    lines.forEach((line, li) => {
      const key = `seg-${i}-ln-${li}`;
      const trimmed = line.trim();
      const ul = /^[-*•]\s+/.test(trimmed);
      const ol = /^\d+[.)]\s+/.test(trimmed);
      if (ul || ol) {
        if (!list) list = { ordered: ol, items: [] };
        list.items.push(trimmed.replace(/^([-*•]|\d+[.)])\s+/, ""));
        return;
      }
      flushList(`${key}-fl`);
      if (!trimmed) return;
      const h = trimmed.match(/^(#{1,4})\s+(.*)$/);
      if (h) {
        nodes.push(
          <div key={key} className="mt-3 mb-1.5 font-bold text-white text-[1.05em] border-r-2 border-cyan-400 pr-2">
            {renderInline(h[2], key)}
          </div>
        );
        return;
      }
      if (/^(-{3,}|_{3,})$/.test(trimmed)) {
        nodes.push(<hr key={key} className="my-3 border-white/10" />);
        return;
      }
      nodes.push(
        <p key={key} className="my-1">
          {renderInline(line, key)}
        </p>
      );
    });
    flushList(`seg-${i}-end`);
  });
  return <div className="text-[13.5px] leading-7">{nodes}</div>;
}

/* ---------- page ---------- */

export default function AiChatPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const nearBottomRef = useRef(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setMessages(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-60)));
    } catch {}
  }, [messages]);

  useEffect(() => {
    if (nearBottomRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streaming]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  const send = async (preset?: string) => {
    const content = (preset ?? input).trim();
    if (!content || streaming) return;

    const history: Msg[] = [...messages, { role: "user", content, time: Date.now() }];
    setMessages([...history, { role: "assistant", content: "", time: Date.now() }]);
    setInput("");
    if (taRef.current) taRef.current.style.height = "auto";
    nearBottomRef.current = true;
    setStreaming(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await authFetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) throw new Error("bad_response");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";
      let failed = "";

      const push = () => {
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { ...copy[copy.length - 1], content: acc };
          return copy;
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n\n")) !== -1) {
          const block = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          for (const line of block.split("\n")) {
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (!data || data === "[DONE]") continue;
            try {
              const j = JSON.parse(data);
              if (j.error) failed = j.error;
              if (j.token) {
                acc += j.token;
                push();
              }
            } catch {}
          }
        }
      }

      if (failed || !acc.trim()) {
        throw new Error(failed || "empty");
      }
    } catch (e) {
      const aborted = ctrl.signal.aborted;
      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (aborted) {
          copy[copy.length - 1] = { ...last, content: last.content || "پاسخ به درخواست شما متوقف شد." };
        } else {
          copy[copy.length - 1] = {
            ...last,
            content: "متأسفانه در حال حاضر اتصال به سرویس هوش مصنوعی برقرار نشد. لطفاً دوباره تلاش کنید.",
            error: true,
          };
        }
        return copy;
      });
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const regenerate = () => {
    if (streaming) return;
    const lastUserIdx = [...messages].map((m) => m.role).lastIndexOf("user");
    if (lastUserIdx === -1) return;
    const lastUser = messages[lastUserIdx];
    const trimmed = messages.slice(0, lastUserIdx);
    setMessages(trimmed);
    setTimeout(() => {
      setMessages(trimmed);
      sendWithHistory(trimmed, lastUser.content);
    }, 0);
  };

  const sendWithHistory = (history: Msg[], content: string) => {
    setInput(content);
    setTimeout(() => sendDirect(history, content), 0);
  };

  const sendDirect = async (history: Msg[], content: string) => {
    setInput("");
    // reuse send by injecting content through state-less path
    const withUser: Msg[] = [...history, { role: "user", content, time: Date.now() }];
    setMessages([...withUser, { role: "assistant", content: "", time: Date.now() }]);
    nearBottomRef.current = true;
    setStreaming(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await authFetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: withUser.map((m) => ({ role: m.role, content: m.content })) }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) throw new Error("bad_response");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";
      let failed = "";
      const push = () =>
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { ...copy[copy.length - 1], content: acc };
          return copy;
        });
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n\n")) !== -1) {
          const block = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          for (const line of block.split("\n")) {
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (!data || data === "[DONE]") continue;
            try {
              const j = JSON.parse(data);
              if (j.error) failed = j.error;
              if (j.token) {
                acc += j.token;
                push();
              }
            } catch {}
          }
        }
      }
      if (failed || !acc.trim()) throw new Error(failed || "empty");
    } catch {
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          ...copy[copy.length - 1],
          content: "متأسفانه در حال حاضر اتصال به سرویس هوش مصنوعی برقرار نشد. لطفاً دوباره تلاش کنید.",
          error: true,
        };
        return copy;
      });
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const stop = () => abortRef.current?.abort();

  const newChat = () => {
    if (streaming) stop();
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const copyMsg = (idx: number, text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(idx);
    setTimeout(() => setCopied(null), 1500);
  };

  const fmtTime = (t: number) =>
    new Date(t).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tehran" });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/tools"
          className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-violet-600 hover:border-violet-200 transition"
        >
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white flex items-center justify-center shadow-lg">
          <BotMessageSquare className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-slate-800">دستیار هوش مصنوعی</h1>
          <p className="text-xs text-slate-500">پاسخ‌گوی هوشمند، نگارش نامه اداری و دستیار روزمره شما</p>
        </div>
        <button
          onClick={newChat}
          className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-600 hover:text-violet-600 hover:border-violet-200 transition"
        >
          <Plus className="w-4 h-4" />
          گفتگوی جدید
        </button>
      </div>

      {/* Chat shell */}
      <div
        className="relative overflow-hidden rounded-2xl border border-slate-700/60 shadow-2xl flex flex-col"
        style={{
          height: "calc(100vh - 220px)",
          minHeight: "520px",
          background:
            "radial-gradient(1000px 500px at 80% -10%, rgba(139,92,246,.18), transparent 60%), radial-gradient(800px 400px at 10% 110%, rgba(6,182,212,.14), transparent 60%), #0b1120",
        }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 lg:px-5 py-3 border-b border-white/10 bg-white/[.03] backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="absolute -bottom-0.5 -left-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0b1120]" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">گپ‌بات شهرداری لاهیجان</p>
              <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                آنلاین • پاسخ‌گویی آنی
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={newChat}
              className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 flex items-center justify-center transition"
              title="گفتگوی جدید"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto px-3 lg:px-6 py-5 space-y-5" style={{ scrollbarWidth: "thin" }}>
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center gap-5 py-8">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-violet-500/40 blur-2xl animate-pulse" />
                <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 flex items-center justify-center shadow-2xl">
                  <Sparkles className="w-9 h-9 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white mb-1">سلام! من دستیار هوشمند شما هستم</h2>
                <p className="text-xs text-slate-400 leading-6 max-w-md">
                  از نگارش نامه اداری تا پاسخ سوالات فنی — سؤالتان را بپرسید یا یکی از پیشنهادهای زیر را انتخاب کنید.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-2xl mt-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-right text-xs leading-6 text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-violet-400/40 rounded-xl px-4 py-3 transition"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => {
            const isUser = m.role === "user";
            const isLastAssistant = !isUser && i === messages.length - 1;
            return (
              <div key={i} className={`flex items-end gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}>
                {isUser ? (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center shrink-0 border border-white/10">
                    <User className="w-4 h-4 text-slate-300" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/20">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                )}

                <div className={`max-w-[82%] lg:max-w-[75%] ${isUser ? "items-start" : "items-end"}`}>
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm shadow-lg ${
                      isUser
                        ? "bg-gradient-to-l from-blue-600 to-violet-600 text-white rounded-bl-md"
                        : m.error
                        ? "bg-red-500/10 border border-red-500/30 text-red-300 rounded-br-md"
                        : "bg-white/[.06] border border-white/10 text-slate-200 rounded-br-md backdrop-blur"
                    }`}
                  >
                    {m.error && (
                      <div className="flex items-center gap-1.5 mb-1 text-red-400 text-xs font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5" /> خطا در دریافت پاسخ
                      </div>
                    )}
                    {isUser ? (
                      <p className="whitespace-pre-wrap leading-7 text-[13.5px]">{m.content}</p>
                    ) : m.content ? (
                      <Markdown text={m.content} />
                    ) : streaming && isLastAssistant ? (
                      <span className="flex items-center gap-1.5 py-1">
                        <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 rounded-full bg-fuchsia-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </span>
                    ) : null}
                    {streaming && isLastAssistant && m.content && (
                      <span className="inline-block w-2 h-4 align-middle bg-cyan-400 animate-pulse rounded-sm mr-0.5" />
                    )}
                  </div>

                  <div className={`flex items-center gap-2 mt-1.5 px-1 ${isUser ? "flex-row-reverse" : ""}`}>
                    <span className="text-[10px] text-slate-500">{fmtTime(m.time)}</span>
                    {!isUser && m.content && !streaming && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => copyMsg(i, m.content)}
                          className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition"
                          title="کپی پاسخ"
                        >
                          {copied === i ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        {i === messages.length - 1 && (
                          <button
                            onClick={regenerate}
                            className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition"
                            title="تولید مجدد پاسخ"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Composer */}
        <div className="p-3 lg:p-4 border-t border-white/10 bg-white/[.03] backdrop-blur">
          <div className="flex items-end gap-2 bg-white/[.06] border border-white/10 focus-within:border-violet-400/50 rounded-2xl p-2 transition">
            <textarea
              ref={taRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 150) + "px";
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder="پیام خود را بنویسید... (Enter = ارسال)"
              className="flex-1 bg-transparent resize-none outline-none text-sm leading-7 text-white placeholder:text-slate-500 px-2 py-1.5 max-h-[150px]"
            />
            {streaming ? (
              <button
                onClick={stop}
                className="w-11 h-11 rounded-xl bg-red-500/90 hover:bg-red-500 text-white flex items-center justify-center transition shadow-lg shadow-red-500/30 shrink-0"
                title="توقف پاسخ"
              >
                <Square className="w-4 h-4" fill="currentColor" />
              </button>
            ) : (
              <button
                onClick={() => send()}
                disabled={!input.trim()}
                className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white flex items-center justify-center transition shadow-lg shadow-violet-500/30 hover:scale-105 disabled:opacity-40 disabled:hover:scale-100 shrink-0"
                title="ارسال"
              >
                <Send className="w-5 h-5 -scale-x-100" />
              </button>
            )}
          </div>
          <p className="text-center text-[10px] text-slate-500 mt-2">
            پاسخ‌های هوش مصنوعی ممکن است همیشه دقیق نباشد؛ موارد مهم را بررسی کنید.
          </p>
        </div>
      </div>
    </div>
  );
}
