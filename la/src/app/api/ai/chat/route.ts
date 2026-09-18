import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/server-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SYSTEM_PROMPT = `شما دستیار هوشمند سامانه داخلی شهرداری لاهیجان هستید.
- همیشه مؤدب، حرفه‌ای و دقیق پاسخ دهید.
- پیش‌فرض پاسخ‌ها به زبان فارسی است، مگر اینکه کاربر به زبان دیگری بنویسد.
- در نگارش نامه‌های اداری و رسمی، صیغه‌های رسمی ادارات ایران را رعایت کنید.
- در پاسخ‌های فنی کوتاه و کاربردی باشید و در صورت نیاز از فرمت مارک‌داون (سرفصل، لیست، کد) استفاده کنید.
- اگر سؤال نامرتبط با کاری پرسیده شد باز هم تا حد امکان کمک کنید.`;

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

function sse(text: string, data: unknown): string {
  return `data: ${data === null ? text : JSON.stringify(data)}\n\n`;
}

export async function POST(request: NextRequest) {
  const authUser = await getAuthFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { messages?: ChatMessage[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "بدنه درخواست نامعتبر است" }, { status: 400 });
  }

  const rawMessages = Array.isArray(body.messages) ? body.messages : [];
  const messages: ChatMessage[] = rawMessages
    .filter((m) => m && typeof m.content === "string" && (m.role === "user" || m.role === "assistant"))
    .slice(-24)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 8000) }));

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) {
    return NextResponse.json({ error: "پیامی ارسال نشده است" }, { status: 400 });
  }

  const apiUrl = process.env.AI_API_URL || "https://text.pollinations.ai/openai";
  const apiKey = process.env.AI_API_KEY || "";
  const model = process.env.AI_MODEL || "openai";

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (chunk: string) => controller.enqueue(encoder.encode(chunk));
      const closeWithError = (msg: string) => {
        send(sse("", { error: msg }));
        send("data: [DONE]\n\n");
        controller.close();
      };

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

      const payload = {
        model,
        stream: true,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      };

      try {
        const upstream = await fetch(apiUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(120000),
        });

        if (!upstream.ok) {
          throw new Error(`upstream_${upstream.status}`);
        }

        const reader = upstream.body?.getReader();
        if (!reader) throw new Error("no_body");

        const decoder = new TextDecoder();
        let buffer = "";
        let gotToken = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let idx: number;
          while ((idx = buffer.indexOf("\n\n")) !== -1) {
            const block = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);
            for (const line of block.split("\n")) {
              if (!line.startsWith("data:")) continue;
              const data = line.slice(5).trim();
              if (!data) continue;
              if (data === "[DONE]") {
                send("data: [DONE]\n\n");
                controller.close();
                return;
              }
              try {
                const json = JSON.parse(data);
                const token: string =
                  json.choices?.[0]?.delta?.content ??
                  json.choices?.[0]?.message?.content ??
                  "";
                if (token) {
                  gotToken = true;
                  send(sse("", { token }));
                }
              } catch {
                // non-JSON keep-alive line, ignore
              }
            }
          }
        }

        if (!gotToken) throw new Error("empty_stream");
        send("data: [DONE]\n\n");
        controller.close();
      } catch {
        // Fallback: keyless GET endpoint (no history, plain text)
        try {
          const fallback = await fetch(
            `https://text.pollinations.ai/${encodeURIComponent(lastUser.content.slice(0, 1500))}?model=openai`,
            { signal: AbortSignal.timeout(120000) }
          );
          if (!fallback.ok) throw new Error(String(fallback.status));
          const text = (await fallback.text()).trim();
          if (!text) throw new Error("empty");
          send(sse("", { token: text }));
          send("data: [DONE]\n\n");
          controller.close();
        } catch {
          closeWithError("در حال حاضر اتصال به سرویس هوش مصنوعی برقرار نشد. لطفاً چند لحظه دیگر دوباره تلاش کنید.");
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
