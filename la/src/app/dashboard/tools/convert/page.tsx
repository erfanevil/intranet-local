"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  FileCog,
  FileUp,
  FileImage,
  FileText,
  FileSpreadsheet,
  FileJson,
  File as FileIcon,
  Download,
  Loader2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { authFetch } from "@/lib/client-auth";

type Category = "image" | "pdf" | "word" | "text" | "csv" | "json";

interface ResultItem {
  name: string;
  url: string;
  size: number;
}

interface TargetDef {
  id: string;
  label: string;
}

const CATEGORY_META: Record<
  Category,
  { label: string; hint: string; icon: typeof FileImage; targets: TargetDef[] }
> = {
  image: {
    label: "تصویر",
    hint: "PNG / JPG / WEBP / BMP / GIF / SVG",
    icon: FileImage,
    targets: [
      { id: "png", label: "PNG" },
      { id: "jpg", label: "JPG" },
      { id: "webp", label: "WebP" },
    ],
  },
  pdf: {
    label: "سند PDF",
    hint: "تبدیل هر صفحه به تصویر",
    icon: FileText,
    targets: [
      { id: "png", label: "PNG (تصویر هر صفحه)" },
      { id: "jpg", label: "JPG (تصویر هر صفحه)" },
    ],
  },
  word: {
    label: "سند Word",
    hint: "DOCX / DOC",
    icon: FileText,
    targets: [{ id: "txt", label: "TXT (متن ساده)" }],
  },
  text: {
    label: "فایل متنی",
    hint: "TXT / MD / LOG",
    icon: FileText,
    targets: [{ id: "pdf", label: "PDF" }],
  },
  csv: {
    label: "فایل CSV",
    hint: "جدول داده",
    icon: FileSpreadsheet,
    targets: [{ id: "json", label: "JSON" }],
  },
  json: {
    label: "فایل JSON",
    hint: "داده ساخت‌یافته",
    icon: FileJson,
    targets: [{ id: "csv", label: "CSV" }],
  },
};

function detectCategory(fileName: string, mime: string): Category | null {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "bmp", "gif", "svg"].includes(ext)) return "image";
  if (ext === "pdf" || mime === "application/pdf") return "pdf";
  if (["docx", "doc"].includes(ext)) return "word";
  if (["txt", "md", "log"].includes(ext)) return "text";
  if (ext === "csv") return "csv";
  if (ext === "json") return "json";
  return null;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes.toLocaleString("fa-IR")} بایت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toLocaleString("fa-IR", { maximumFractionDigits: 1 })} کیلوبایت`;
  return `${(bytes / (1024 * 1024)).toLocaleString("fa-IR", { maximumFractionDigits: 2 })} مگابایت`;
}

function baseName(name: string): string {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(0, i) : name;
}

function blobToResult(name: string, blob: Blob): ResultItem {
  return { name, url: URL.createObjectURL(blob), size: blob.size };
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), type, quality);
  });
}

/* ---------- converters ---------- */

async function convertImage(file: File, target: string, quality: number): Promise<ResultItem[]> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    if (target === "jpg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0);
    const mime = target === "jpg" ? "image/jpeg" : `image/${target}`;
    const blob = await canvasToBlob(canvas, mime, quality);
    return [blobToResult(`${baseName(file.name)}.${target}`, blob)];
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function convertPdfToImages(file: File, target: string, scale: number, onProgress: (t: string) => void): Promise<ResultItem[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pdfjs: any;
  try {
    const loadModule = new Function("url", "return import(url)") as (url: string) => Promise<unknown>;
    pdfjs = await loadModule("/js/pdf.min.mjs");
  } catch {
    throw new Error("کتابخانه PDF بارگذاری نشد");
  }
  pdfjs.GlobalWorkerOptions.workerSrc = "/js/pdf.worker.min.mjs";
  const data = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data }).promise;
  const total = Math.min(pdf.numPages, 20);
  const results: ResultItem[] = [];
  for (let i = 1; i <= total; i++) {
    onProgress(`در حال پردازش صفحه ${i.toLocaleString("fa-IR")} از ${total.toLocaleString("fa-IR")}...`);
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (target === "jpg" && ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    await page.render({ canvasContext: ctx, viewport }).promise;
    const blob = await canvasToBlob(canvas, target === "jpg" ? "image/jpeg" : "image/png", 0.92);
    results.push(blobToResult(`${baseName(file.name)}-page-${i}.${target}`, blob));
  }
  if (pdf.numPages > total) {
    onProgress(`تنها ${total.toLocaleString("fa-IR")} صفحه نخست تبدیل شد (محدودیت ${total.toLocaleString("fa-IR")} صفحه).`);
  }
  return results;
}

async function convertWordToText(file: File): Promise<ResultItem[]> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await authFetch("/api/convert/text", { method: "POST", body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "خطا در تبدیل فایل Word");
  const blob = new Blob(["\ufeff" + data.text], { type: "text/plain;charset=utf-8" });
  return [blobToResult(`${baseName(file.name)}.txt`, blob)];
}

async function convertTextToPdf(file: File): Promise<ResultItem[]> {
  const text = await file.text();
  if (!text.trim()) throw new Error("فایل متنی خالی است");

  const { PDFDocument } = await import("pdf-lib");

  const pageW = 1240;
  const pageH = 1754;
  const margin = 90;
  const lineHeight = 54;
  const isRtl = /[؀-ۿ]/.test(text);

  const measureCanvas = document.createElement("canvas");
  const mctx = measureCanvas.getContext("2d");
  if (!mctx) throw new Error("canvas");
  mctx.font = "30px Vazirmatn, Tahoma, sans-serif";

  // wrap text into lines
  const lines: string[] = [];
  const paragraphs = text.replace(/\r/g, "").split("\n");
  for (const para of paragraphs) {
    if (!para.trim()) {
      lines.push("");
      continue;
    }
    const words = para.split(/\s+/).filter(Boolean);
    let current = "";
    for (const word of words) {
      const test = current ? current + " " + word : word;
      if (mctx.measureText(test).width > pageW - margin * 2 && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
  }

  const linesPerPage = Math.floor((pageH - margin * 2) / lineHeight);
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += linesPerPage) {
    pages.push(lines.slice(i, i + linesPerPage));
  }

  const doc = await PDFDocument.create();
  for (const pageLines of pages) {
    const canvas = document.createElement("canvas");
    canvas.width = pageW;
    canvas.height = pageH;
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, pageW, pageH);
    ctx.fillStyle = "#111827";
    ctx.font = "30px Vazirmatn, Tahoma, sans-serif";
    ctx.direction = isRtl ? "rtl" : "ltr";
    ctx.textAlign = isRtl ? "right" : "left";
    ctx.textBaseline = "top";
    const x = isRtl ? pageW - margin : margin;
    pageLines.forEach((line, idx) => {
      ctx.fillText(line, x, margin + idx * lineHeight);
    });
    const blob = await canvasToBlob(canvas, "image/png", 1);
    const png = await doc.embedPng(await blob.arrayBuffer());
    const page = doc.addPage([595.28, 841.89]);
    page.drawImage(png, { x: 0, y: 0, width: 595.28, height: 841.89 });
  }

  const bytes = await doc.save();
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const blob = new Blob([arrayBuffer], { type: "application/pdf" });
  return [blobToResult(`${baseName(file.name)}.pdf`, blob)];
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f !== "")) rows.push(row);
  return rows;
}

async function convertCsvToJson(file: File): Promise<ResultItem[]> {
  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length < 1) throw new Error("داده‌ای در فایل CSV یافت نشد");
  const headers = rows[0].map((h, i) => h.trim() || `col_${i + 1}`);
  const out = rows.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => (obj[h] = r[i] ?? ""));
    return obj;
  });
  const blob = new Blob(["\ufeff" + JSON.stringify(out, null, 2)], { type: "application/json;charset=utf-8" });
  return [blobToResult(`${baseName(file.name)}.json`, blob)];
}

async function convertJsonToCsv(file: File): Promise<ResultItem[]> {
  const text = await file.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("فایل JSON معتبر نیست");
  }
  const arr = Array.isArray(data) ? data : [data];
  const objects = arr.filter((x) => x && typeof x === "object" && !Array.isArray(x)) as Record<string, unknown>[];
  if (!objects.length) throw new Error("برای تبدیل به CSV به آرایه‌ای از اشیاء نیاز است");
  const headers: string[] = [];
  objects.forEach((o) => Object.keys(o).forEach((k) => !headers.includes(k) && headers.push(k)));
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csvRows = [headers.join(",")];
  objects.forEach((o) => csvRows.push(headers.map((h) => esc(o[h])).join(",")));
  const blob = new Blob(["\ufeff" + csvRows.join("\r\n")], { type: "text/csv;charset=utf-8" });
  return [blobToResult(`${baseName(file.name)}.csv`, blob)];
}

/* ---------- page ---------- */

export default function ConvertPage() {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [target, setTarget] = useState<string>("");
  const [quality, setQuality] = useState(0.92);
  const [pdfScale, setPdfScale] = useState(2);
  const [busy, setBusy] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState("");
  const [results, setResults] = useState<ResultItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const clearResults = (items: ResultItem[]) => items.forEach((r) => URL.revokeObjectURL(r.url));

  const pickFile = (f: File) => {
    const cat = detectCategory(f.name, f.type);
    clearResults(results);
    setResults([]);
    setError("");
    if (!cat) {
      setFile(null);
      setCategory(null);
      setError("این فرمت پشتیبانی نمی‌شود. فرمت‌های مجاز: تصویر، PDF، Word، TXT، CSV و JSON");
      return;
    }
    setFile(f);
    setCategory(cat);
    const meta = CATEGORY_META[cat];
    const inputExt = f.name.split(".").pop()?.toLowerCase();
    const defaultTarget = meta.targets.find((t) => t.id !== inputExt)?.id || meta.targets[0].id;
    setTarget(defaultTarget);
  };

  const reset = () => {
    clearResults(results);
    setFile(null);
    setCategory(null);
    setResults([]);
    setError("");
    setStatusText("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const runConvert = async () => {
    if (!file || !category || !target) return;
    setBusy(true);
    setError("");
    setStatusText("در حال آماده‌سازی...");
    try {
      let out: ResultItem[] = [];
      switch (category) {
        case "image":
          setStatusText("در حال پردازش تصویر...");
          out = await convertImage(file, target, quality);
          break;
        case "pdf":
          out = await convertPdfToImages(file, target, pdfScale, setStatusText);
          break;
        case "word":
          setStatusText("در حال استخراج متن سند...");
          out = await convertWordToText(file);
          break;
        case "text":
          setStatusText("در حال ساخت PDF...");
          out = await convertTextToPdf(file);
          break;
        case "csv":
          setStatusText("در حال تبدیل CSV به JSON...");
          out = await convertCsvToJson(file);
          break;
        case "json":
          setStatusText("در حال تبدیل JSON به CSV...");
          out = await convertJsonToCsv(file);
          break;
      }
      clearResults(results);
      setResults(out);
      setStatusText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در تبدیل فایل");
      setStatusText("");
    } finally {
      setBusy(false);
    }
  };

  const Meta = category ? CATEGORY_META[category] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/tools"
          className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-200 transition"
        >
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 text-white flex items-center justify-center shadow-lg">
          <FileCog className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-800">تبدیل فرمت فایل</h1>
          <p className="text-xs text-slate-500">فایل خود را آپلود کنید و فرمت دلخواه را دریافت کنید</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* Right: upload + options */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5">
          <h2 className="font-bold text-slate-700 text-sm flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">۱</span>
            انتخاب فایل
          </h2>

          {!file ? (
            <button
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files?.[0];
                if (f) pickFile(f);
              }}
              className={`w-full border-2 border-dashed rounded-2xl p-10 flex flex-col items-center gap-3 transition group ${
                dragOver ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:border-blue-400 hover:bg-slate-50"
              }`}
            >
              <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileUp className="w-8 h-8" />
              </div>
              <div className="text-sm font-semibold text-slate-700">فایل را اینجا رها کنید یا کلیک کنید</div>
              <div className="text-[11px] text-slate-400 leading-5 text-center">
                تصویر (PNG, JPG, WebP, BMP, GIF) • PDF • Word (docx, doc) • TXT / MD • CSV • JSON
              </div>
            </button>
          ) : (
            <div className={`border rounded-2xl p-4 flex items-center gap-3 ${error ? "border-red-200 bg-red-50" : "border-slate-200 bg-slate-50"}`}>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0 ${category === "image" ? "bg-emerald-500" : category === "pdf" ? "bg-red-500" : category === "word" ? "bg-blue-500" : "bg-slate-500"}`}>
                {Meta ? <Meta.icon className="w-5 h-5" /> : <FileIcon className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-700 truncate">{file.name}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {formatSize(file.size)}
                  {Meta && ` • نوع: ${Meta.label}`}
                </p>
              </div>
              <button onClick={reset} className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 flex items-center justify-center transition">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept="image/*,.pdf,.docx,.doc,.txt,.md,.log,.csv,.json"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) pickFile(f);
            }}
          />

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-xs leading-5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {file && Meta && (
            <>
              <h2 className="font-bold text-slate-700 text-sm flex items-center gap-2 pt-2">
                <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">۲</span>
                فرمت خروجی
              </h2>
              <div className="flex flex-wrap gap-2">
                {Meta.targets.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTarget(t.id)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition ${
                      target === t.id
                        ? "bg-blue-600 border-blue-600 text-white shadow"
                        : "bg-white border-slate-200 text-slate-600 hover:border-blue-300"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {category === "image" && target !== "png" && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>کیفیت تصویر</span>
                    <span className="font-bold text-slate-700">{Math.round(quality * 100).toLocaleString("fa-IR")}٪</span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={1}
                    step={0.01}
                    value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))}
                    className="w-full accent-blue-600"
                    dir="ltr"
                  />
                </div>
              )}

              {category === "pdf" && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>کیفیت خروجی (مقیاس رندر)</span>
                    <span className="font-bold text-slate-700">{pdfScale.toLocaleString("fa-IR")}x</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.5}
                    value={pdfScale}
                    onChange={(e) => setPdfScale(Number(e.target.value))}
                    className="w-full accent-blue-600"
                    dir="ltr"
                  />
                  <p className="text-[11px] text-slate-400">حداکثر ۲۰ صفحه نخست سند تبدیل می‌شود.</p>
                </div>
              )}

              <button
                onClick={runConvert}
                disabled={busy || !target}
                className="w-full mt-2 py-3.5 rounded-xl bg-gradient-to-l from-blue-600 to-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 hover:-translate-y-0.5 transition disabled:opacity-60 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
              >
                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                {busy ? "در حال تبدیل..." : "شروع تبدیل"}
              </button>
            </>
          )}
        </div>

        {/* Left: results */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 min-h-[300px]">
          <h2 className="font-bold text-slate-700 text-sm flex items-center gap-2 mb-4">
            <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">۳</span>
            دریافت خروجی
          </h2>

          {busy && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
              <p className="text-sm text-slate-500">{statusText}</p>
            </div>
          )}

          {!busy && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-300 flex items-center justify-center">
                <Download className="w-8 h-8" />
              </div>
              <p className="text-sm text-slate-400">فایل‌های تبدیل‌شده اینجا نمایش داده می‌شوند</p>
            </div>
          )}

          {!busy && results.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl p-3 text-xs font-medium">
                <CheckCircle2 className="w-4 h-4" />
                {results.length.toLocaleString("fa-IR")} فایل با موفقیت ساخته شد
              </div>
              <div className="max-h-[420px] overflow-y-auto space-y-2 pl-1">
                {results.map((r) => (
                  <div key={r.url} className="flex items-center gap-3 border border-slate-200 rounded-xl p-3 hover:border-blue-200 hover:bg-blue-50/40 transition">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                      <FileIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700 truncate" dir="ltr">{r.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{formatSize(r.size)}</p>
                    </div>
                    <a
                      href={r.url}
                      download={r.name}
                      className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition shrink-0"
                      title="دانلود"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Supported formats */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-bold text-slate-700 text-sm mb-4">تبدیل‌های پشتیبانی‌شده</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            "تصویر ⇄ PNG / JPG / WebP",
            "PDF ⇐ تصویر هر صفحه",
            "Word ⇐ متن TXT",
            "TXT ⇐ سند PDF",
            "CSV ⇐ JSON",
            "JSON ⇐ CSV",
          ].map((s) => (
            <div key={s} className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-[11px] text-slate-600 text-center font-medium">
              {s}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
