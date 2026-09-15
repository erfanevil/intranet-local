"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { authFetch, getToken } from "@/lib/client-auth";
import { formatShortDateFA } from "@/lib/date";

interface SignReq {
  id: number; documentOriginalName: string; signedFilename?: string; description?: string;
  status: string; signedAt?: string; createdAt: string;
  senderName?: string; senderPosition?: string; signerName?: string; signerPosition?: string;
}
interface PreviewData {
  mode: "image" | "pdf" | "unsupported"; filename: string; url?: string; message?: string;
}
// Signature placement on a page — all values are fractions of that page's rendered box
interface PagePlacement { xPct: number; yPct: number; wPct: number }
interface PendingPlacement extends PagePlacement { page: number }

const DEFAULT_PLACEMENT: PagePlacement = { xPct: 0.06, yPct: 0.78, wPct: 0.22 };

function toFaDigits(n: number | string): string {
  const fa = "۰۱۲۳۴۵۶۷۸۹";
  return String(n).replace(/\d/g, (d) => fa[Number(d)]);
}

export default function SignaturesPage() {
  const [tab, setTab] = useState<"received" | "sent">("received");
  const [reqs, setReqs] = useState<SignReq[]>([]);
  const [loading, setLoading] = useState(true);

  const [signingId, setSigningId] = useState<number | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [sigUrl, setSigUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Multi-page document state (PDF = N pages, image document = 1 page)
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageImage, setPageImage] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [placements, setPlacements] = useState<Record<number, PagePlacement>>({});
  const pdfDocRef = useRef<{ numPages: number; getPage: (n: number) => Promise<unknown>; destroy?: () => Promise<void> } | null>(null);
  const pageCacheRef = useRef<Record<number, string>>({});
  const lastPlacementRef = useRef<PagePlacement>(DEFAULT_PLACEMENT);
  const sigAspectRef = useRef(0.5); // signature image height / width

  // Drag state
  const [dragging, setDragging] = useState(false);
  const dragOffRef = useRef({ x: 0, y: 0 });

  const wrapperRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const pdfImgRef = useRef<HTMLImageElement>(null);

  const [showSmsModal, setShowSmsModal] = useState(false);
  const [smsCode, setSmsCode] = useState("");
  const [smsSending, setSmsSending] = useState(false);
  const [smsVerifying, setSmsVerifying] = useState(false);
  const [smsError, setSmsError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);
  const [pendingPlacements, setPendingPlacements] = useState<PendingPlacement[]>([]);

  useEffect(() => { if (countdown <= 0) return; const t = setTimeout(() => setCountdown(c => c - 1), 1000); return () => clearTimeout(t); }, [countdown]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await authFetch(`/api/sign-requests?type=${tab}`);
    const data = await res.json();
    setReqs(data.requests || []);
    setLoading(false);
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  // Render one PDF page to an image (cached)
  const renderPdfPage = useCallback(async (pageNum: number): Promise<string | null> => {
    const cached = pageCacheRef.current[pageNum];
    if (cached) return cached;
    const pdf = pdfDocRef.current;
    if (!pdf) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const page: any = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    const url = canvas.toDataURL("image/jpeg", 0.88);
    pageCacheRef.current[pageNum] = url;
    return url;
  }, []);

  // Load PDF once and get page count
  const loadPdfDocument = useCallback(async (docId: number) => {
    const token = getToken();
    setPdfLoading(true);
    try {
      const res = await fetch(`/api/sign-requests/${docId}/pdf-image?token=${token}`);
      if (!res.ok) { setPdfLoading(false); return; }
      const arrayBuffer = await res.arrayBuffer();

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error dynamic import from public folder
      const pdfjs = await import(/* webpackIgnore: true */ "/js/pdf.min.mjs");
      pdfjs.GlobalWorkerOptions.workerSrc = "/js/pdf.worker.min.mjs";

      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      pdfDocRef.current = pdf;
      setNumPages(pdf.numPages as number);
      const url = await renderPdfPage(1);
      if (url) setPageImage(url);
    } catch (err) {
      console.error("PDF render error:", err);
    } finally {
      setPdfLoading(false);
    }
  }, [renderPdfPage]);

  // Switch page (renders on demand, uses cache)
  const goToPage = useCallback(async (n: number) => {
    const total = pdfDocRef.current?.numPages || 0;
    if (!total || n < 1 || n > total) return;
    setCurrentPage(n);
    const cached = pageCacheRef.current[n];
    if (cached) { setPageImage(cached); return; }
    setPageLoading(true);
    try {
      const url = await renderPdfPage(n);
      if (url) setPageImage(url);
    } finally {
      setPageLoading(false);
    }
  }, [renderPdfPage]);

  const openSign = async (r: SignReq) => {
    const token = getToken();
    setSigningId(r.id);
    setCurrentPage(1);
    setNumPages(0);
    setPageImage(null);
    setPlacements({ 1: { ...DEFAULT_PLACEMENT } });
    lastPlacementRef.current = { ...DEFAULT_PLACEMENT };
    pageCacheRef.current = {};
    if (pdfDocRef.current?.destroy) { try { pdfDocRef.current.destroy(); } catch { /* noop */ } }
    pdfDocRef.current = null;

    const [pRes, sRes] = await Promise.all([
      fetch(`/api/sign-requests/${r.id}/preview?token=${token}`),
      fetch(`/api/sign-requests/${r.id}/my-signature?token=${token}`),
    ]);
    const previewData = await pRes.json();
    setPreview(previewData);
    const signatureUrl = sRes.ok ? `/api/sign-requests/${r.id}/my-signature?token=${token}` : null;
    setSigUrl(signatureUrl);
    if (signatureUrl) {
      const img = new Image();
      img.onload = () => { if (img.naturalWidth > 0) sigAspectRef.current = img.naturalHeight / img.naturalWidth; };
      img.src = signatureUrl;
    }
    if (previewData.mode === "pdf") { loadPdfDocument(r.id); }
  };

  const closeSign = () => {
    setSigningId(null); setPreview(null); setSigUrl(null);
    setPendingBlob(null); setPendingPlacements([]);
    setShowSmsModal(false); setSmsCode(""); setSmsError("");
    setPageImage(null); setNumPages(0); setCurrentPage(1); setPlacements({});
    pageCacheRef.current = {};
    if (pdfDocRef.current?.destroy) { try { pdfDocRef.current.destroy(); } catch { /* noop */ } }
    pdfDocRef.current = null;
  };

  const currentPlacement = placements[currentPage] || null;

  const clampPlacement = useCallback((pl: PagePlacement): PagePlacement => {
    const r = wrapperRef.current?.getBoundingClientRect();
    if (!r || r.width === 0 || r.height === 0) return pl;
    const sigW = pl.wPct * r.width;
    const sigH = sigW * sigAspectRef.current;
    const wPct = Math.max(0.05, Math.min(pl.wPct, 0.85));
    return {
      wPct,
      xPct: Math.max(0, Math.min(pl.xPct, (r.width - sigW) / r.width)),
      yPct: Math.max(0, Math.min(pl.yPct, (r.height - sigH) / r.height)),
    };
  }, []);

  const updateCurrentPlacement = useCallback((updater: (p: PagePlacement) => PagePlacement) => {
    setPlacements(prev => {
      const cur = prev[currentPage];
      if (!cur) return prev;
      const next = clampPlacement(updater(cur));
      lastPlacementRef.current = next;
      return { ...prev, [currentPage]: next };
    });
  }, [currentPage, clampPlacement]);

  // Enable / disable the signature on the current page
  const toggleSignCurrentPage = () => {
    setPlacements(prev => {
      const next = { ...prev };
      if (next[currentPage]) {
        lastPlacementRef.current = next[currentPage];
        delete next[currentPage];
      } else {
        next[currentPage] = clampPlacement({ ...lastPlacementRef.current });
      }
      return next;
    });
  };

  // One-click: sign every page of the document with the same placement
  const signAllPages = () => {
    const base = { ...lastPlacementRef.current };
    setPlacements(() => {
      const next: Record<number, PagePlacement> = {};
      for (let i = 1; i <= numPages; i++) next[i] = { ...base };
      return next;
    });
  };

  // ---------- Drag & drop (percentage based, works on every page) ----------
  const handleDragStart = (clientX: number, clientY: number) => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    const p = placements[currentPage];
    if (!rect || !p) return;
    dragOffRef.current = { x: clientX - rect.left - p.xPct * rect.width, y: clientY - rect.top - p.yPct * rect.height };
    setDragging(true);
  };
  const handleDragMove = (clientX: number, clientY: number) => {
    if (!dragging || !wrapperRef.current) return;
    const r = wrapperRef.current.getBoundingClientRect();
    updateCurrentPlacement(p => ({
      ...p,
      xPct: (clientX - r.left - dragOffRef.current.x) / r.width,
      yPct: (clientY - r.top - dragOffRef.current.y) / r.height,
    }));
  };
  const handleMouseDown = (e: React.MouseEvent) => { e.preventDefault(); handleDragStart(e.clientX, e.clientY); };
  const handleMouseMove = (e: React.MouseEvent) => handleDragMove(e.clientX, e.clientY);
  const handleTouchStart = (e: React.TouchEvent) => { const t = e.touches[0]; handleDragStart(t.clientX, t.clientY); };
  const handleTouchMove = (e: React.TouchEvent) => { const t = e.touches[0]; handleDragMove(t.clientX, t.clientY); };
  const stopDrag = () => setDragging(false);

  const sigCount = Object.keys(placements).length;
  const signedPagesList = Object.keys(placements).map(Number).sort((a, b) => a - b);

  const sendSmsCode = async () => {
    setSmsSending(true);
    setSmsError("");
    try {
      const res = await authFetch("/api/sms/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signRequestId: signingId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "خطا در ارسال پیامک");
      setCountdown(120);
    } catch (err) {
      setSmsError(err instanceof Error ? err.message : "خطای نامشخص");
    } finally {
      setSmsSending(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview || !sigUrl) return;
    if (sigCount === 0) {
      alert("هنوز هیچ صفحه‌ای برای امضا انتخاب نشده است.\nبا دکمه «امضا در این صفحه» امضا را فعال کنید.");
      return;
    }
    setSubmitting(true);
    try {
      if (preview.mode === "pdf") {
        // Multi-page flow: server overlays the signature on each selected PDF page
        const list: PendingPlacement[] = signedPagesList.map(page => ({ page, ...placements[page] }));
        setPendingPlacements(list);
        setPendingBlob(null);
        setSmsCode(""); setSmsError(""); setShowSmsModal(true);
        await sendSmsCode();
        return;
      }

      // Single image flow: composite client-side on canvas
      const p = placements[1];
      if (!p || !wrapperRef.current) return;
      const sigImg = new Image(); sigImg.crossOrigin = "anonymous";
      await new Promise<void>((res, rej) => { sigImg.onload = () => res(); sigImg.onerror = () => rej(new Error("خطا در بارگذاری امضا")); sigImg.src = sigUrl; });

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("خطا در ایجاد canvas");
      const sourceImg = imageRef.current;
      if (!sourceImg) throw new Error("سند آماده نیست. لطفاً صبر کنید.");

      canvas.width = sourceImg.naturalWidth; canvas.height = sourceImg.naturalHeight;
      ctx.drawImage(sourceImg, 0, 0);
      const dw = p.wPct * canvas.width;
      const dh = dw * sigAspectRef.current;
      ctx.drawImage(sigImg, p.xPct * canvas.width, p.yPct * canvas.height, dw, dh);

      const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, "image/png"));
      if (!blob) throw new Error("خطا در ایجاد تصویر");
      setPendingBlob(blob);
      setPendingPlacements([]);
      setSmsCode(""); setSmsError(""); setShowSmsModal(true);
      await sendSmsCode();
    } catch (err) { alert(err instanceof Error ? err.message : "خطای نامشخص"); }
    finally { setSubmitting(false); }
  };

  const verifySmsAndSign = async () => {
    if (!smsCode.trim() || !signingId) return;
    if (!pendingBlob && pendingPlacements.length === 0) return;
    setSmsVerifying(true);
    setSmsError("");
    try {
      const vRes = await authFetch("/api/sms/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: smsCode.trim() })
      });
      const vData = await vRes.json();
      if (!vRes.ok) throw new Error(vData.error || "کد نامعتبر");

      const fd = new FormData();
      if (pendingPlacements.length > 0 && sigUrl) {
        // PDF multi-page: raw signature + placements, server does the overlay
        const sigRes = await fetch(sigUrl);
        if (!sigRes.ok) throw new Error("خطا در دریافت فایل امضا");
        const sigBlob = await sigRes.blob();
        fd.append("signature", sigBlob, "signature.png");
        fd.append("placements", JSON.stringify(pendingPlacements));
      } else if (pendingBlob) {
        fd.append("signedImage", pendingBlob, "signed.png");
      }
      const sRes = await fetch(`/api/sign-requests/${signingId}/sign`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd
      });
      const sData = await sRes.json();
      if (!sRes.ok) throw new Error(sData.error || "خطا در ثبت امضا");

      closeSign();
      load();
    } catch (err) {
      setSmsError(err instanceof Error ? err.message : "خطای نامشخص");
    } finally {
      setSmsVerifying(false);
    }
  };

  const dlSigned = (r: SignReq) => window.open(`/api/sign-requests/${r.id}/document?token=${getToken()}&signed=true`, "_blank");
  const dlDoc = (r: SignReq) => window.open(`/api/sign-requests/${r.id}/document?token=${getToken()}`, "_blank");
  const delReq = async (r: SignReq) => { if (!confirm("حذف درخواست؟")) return; const res = await authFetch(`/api/sign-requests/${r.id}`, { method: "DELETE" }); if (res.ok) setReqs(p => p.filter(x => x.id !== r.id)); };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  const pageReady = preview?.mode === "image" || (preview?.mode === "pdf" && !!pageImage && !pdfLoading);
  const isSignable = sigUrl && sigCount > 0 && pageReady;

  return (
    <div>
      <div className="mb-6"><h1 className="text-2xl font-bold text-slate-800">امضا الکترونیک</h1><p className="text-slate-500 text-sm mt-1">مدیریت درخواست‌های امضای اسناد</p></div>
      <div className="flex gap-1 bg-slate-100 p-1.5 rounded-xl w-fit mb-6">
        <button onClick={() => setTab("received")} className={`px-5 py-2 rounded-lg text-sm font-medium transition ${tab === "received" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}>نیاز به امضای من</button>
        <button onClick={() => setTab("sent")} className={`px-5 py-2 rounded-lg text-sm font-medium transition ${tab === "sent" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}>ارسال شده</button>
      </div>

      {reqs.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-16 text-center">
          <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
          <h3 className="text-lg font-semibold text-slate-500">درخواستی وجود ندارد</h3>
        </div>
      ) : (
        <div className="space-y-3">
          {reqs.map(r => (
            <div key={r.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center gap-4 hover:shadow-md transition">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${r.status === "signed" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                {r.status === "signed" ? <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-800 text-sm truncate">{r.documentOriginalName}</h3>
                {r.description && <p className="text-xs text-slate-500 truncate">{r.description}</p>}
                <div className="text-xs text-slate-400 mt-1">{tab === "received" ? <span>از: {r.senderName}</span> : <span>امضاکننده: {r.signerName}</span>}<span> • {formatShortDateFA(r.createdAt)}</span>{r.status === "signed" && r.signedAt && <span> • امضا: {formatShortDateFA(r.signedAt)}</span>}</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                {r.status === "signed" ? (<><span className="text-green-600 font-medium text-xs bg-green-50 px-3 py-1.5 rounded-full">امضا شده</span><button onClick={() => dlSigned(r)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">دانلود امضا شده</button><button onClick={() => dlDoc(r)} className="px-3 py-1.5 bg-slate-200 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-300">اصل سند</button></>) : tab === "received" ? (<button onClick={() => openSign(r)} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-medium shadow">مشاهده و امضا</button>) : (<span className="text-amber-600 font-medium text-xs bg-amber-50 px-3 py-1.5 rounded-full">در انتظار</span>)}
                {r.status !== "signed" && <button onClick={() => delReq(r)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sign Modal */}
      {signingId && preview && (preview.mode === "image" || preview.mode === "pdf") && preview.url && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-2">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between rounded-t-2xl flex-wrap gap-2">
              <h2 className="text-base font-bold text-slate-800">
                امضای سند
                {preview.mode === "pdf" && numPages > 0 && (
                  <span className="text-xs text-slate-500 font-normal mr-2">
                    (سند {toFaDigits(numPages)} صفحه‌ای
                    {sigCount > 0 && <> — {toFaDigits(sigCount)} صفحه امضا می‌شود</>})
                  </span>
                )}
              </h2>
              <div className="flex items-center gap-3">
                <label className="text-xs text-slate-600">اندازه امضا:</label>
                <input
                  type="range" min="8" max="60" disabled={!currentPlacement}
                  value={currentPlacement ? Math.round(currentPlacement.wPct * 100) : 22}
                  onChange={e => updateCurrentPlacement(p => ({ ...p, wPct: Number(e.target.value) / 100 }))}
                  className="w-32 disabled:opacity-40"
                />
                <button onClick={closeSign} className="p-2 hover:bg-slate-200 rounded-lg"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
            </div>

            {/* Page navigation toolbar (multi-page PDFs) */}
            {preview.mode === "pdf" && numPages > 0 && (
              <div className="px-4 py-2.5 bg-white border-b border-slate-100 flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1 || pageLoading}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    قبلی
                  </button>
                  <span className="text-xs text-slate-600 font-semibold min-w-[90px] text-center">
                    صفحه {toFaDigits(currentPage)} از {toFaDigits(numPages)}
                  </span>
                  <button
                    onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= numPages || pageLoading}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1"
                  >
                    بعدی
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                </div>

                <button
                  onClick={toggleSignCurrentPage}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${currentPlacement ? "bg-green-600 text-white hover:bg-green-700" : "bg-slate-200 text-slate-600 hover:bg-slate-300"}`}
                >
                  {currentPlacement ? (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  )}
                  {currentPlacement ? "این صفحه امضا می‌شود" : "امضا در این صفحه"}
                </button>

                {numPages > 1 && (
                  <button
                    onClick={signAllPages}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-green-300 text-green-700 hover:bg-green-50 transition flex items-center gap-1.5"
                    title="اعمال امضا در محل فعلی روی همه صفحات سند"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    امضای همه صفحات
                  </button>
                )}

                {numPages > 1 && numPages <= 20 && (
                  <div className="hidden lg:flex items-center gap-1 mr-auto">
                    {Array.from({ length: numPages }, (_, i) => i + 1).map(n => (
                      <button
                        key={n}
                        onClick={() => goToPage(n)}
                        className={`relative w-7 h-7 text-[11px] rounded-md font-medium transition ${
                          n === currentPage
                            ? "bg-blue-600 text-white shadow"
                            : placements[n]
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                        title={placements[n] ? `صفحه ${toFaDigits(n)} — امضا می‌شود` : `صفحه ${toFaDigits(n)}`}
                      >
                        {toFaDigits(n)}
                        {placements[n] && <span className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-green-500 rounded-full border border-white" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex-1 overflow-auto p-4 bg-slate-100 flex items-start justify-center" dir="ltr">
              <div ref={wrapperRef} className="relative bg-white shadow-lg max-w-full" dir="rtl" style={{ cursor: dragging ? "grabbing" : "default" }}
                onMouseMove={handleMouseMove} onMouseUp={stopDrag} onMouseLeave={stopDrag} onTouchMove={handleTouchMove} onTouchEnd={stopDrag}>

                {preview.mode === "image" && <img ref={imageRef} src={preview.url} alt={preview.filename} className="max-w-full block" draggable={false} crossOrigin="anonymous" />}

                {preview.mode === "pdf" && pageImage && <img ref={pdfImgRef} src={pageImage} alt={`صفحه ${toFaDigits(currentPage)}`} className="max-w-full block" draggable={false} />}

                {preview.mode === "pdf" && (pdfLoading || pageLoading || !pageImage) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 min-h-[300px] min-w-[300px]">
                    {(pdfLoading || pageLoading) ? (
                      <>
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm text-slate-500 mt-3">{pdfLoading ? "در حال بارگذاری سند..." : `در حال نمایش صفحه ${toFaDigits(currentPage)}...`}</span>
                      </>
                    ) : (
                      <span className="text-sm text-red-500">خطا در بارگذاری PDF</span>
                    )}
                  </div>
                )}

                {sigUrl && currentPlacement && pageReady && (
                  <div
                    style={{ position: "absolute", left: `${currentPlacement.xPct * 100}%`, top: `${currentPlacement.yPct * 100}%`, width: `${currentPlacement.wPct * 100}%`, cursor: "grab", touchAction: "none", zIndex: 10 }}
                    onMouseDown={handleMouseDown} onTouchStart={handleTouchStart}
                  >
                    <img src={sigUrl} alt="امضا" style={{ width: "100%", opacity: 0.92, pointerEvents: "none", userSelect: "none" }} draggable={false} />
                    <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow" />
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs text-slate-500">
                {preview.mode === "pdf"
                  ? sigCount > 0
                    ? <>امضا را روی هر صفحه بکشید و رها کنید. <span className="font-semibold text-green-700">صفحات امضاشده: {signedPagesList.map(toFaDigits).join("، ")}</span></>
                    : "برای امضا، ابتدا دکمه «امضا در این صفحه» را بزنید و بین صفحات جابه‌جا شوید"
                  : "امضا را بکشید روی محل مناسب"}
              </p>
              <div className="flex gap-3">
                <button onClick={closeSign} className="px-5 py-2.5 border-2 border-slate-200 rounded-xl hover:bg-slate-50 text-sm">انصراف</button>
                <button onClick={handleConfirm} disabled={submitting || !isSignable} className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl disabled:opacity-50 font-medium text-sm shadow-lg shadow-green-500/25">
                  {submitting ? "صبر کنید..." : sigCount > 1 ? `تأیید و امضای ${toFaDigits(sigCount)} صفحه` : "تأیید و ارسال کد"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unsupported */}
      {signingId && preview && preview.mode === "unsupported" && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 text-center">
            <svg className="w-16 h-16 text-amber-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
            <h3 className="text-lg font-bold text-slate-800 mb-2">فرمت پشتیبانی نمی‌شود</h3>
            <p className="text-sm text-slate-500 mb-6">{preview.message}</p>
            <button onClick={closeSign} className="px-5 py-2.5 border-2 border-slate-200 rounded-xl hover:bg-slate-50 text-sm">بستن</button>
          </div>
        </div>
      )}

      {/* SMS Modal */}
      {showSmsModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="relative p-8 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-center">
              <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
              <h2 className="text-xl font-bold text-white">تأیید هویت</h2>
              <p className="text-blue-200 text-sm mt-2">کد ۵ رقمی به موبایل شما پیامک شد</p>
              {pendingPlacements.length > 0 && (
                <p className="text-blue-100 text-xs mt-2 bg-white/10 rounded-lg py-1.5 px-3 inline-block">
                  امضای {toFaDigits(pendingPlacements.length)} صفحه: {pendingPlacements.map(p => toFaDigits(p.page)).join("، ")}
                </p>
              )}
            </div>
            <div className="p-8 space-y-5">
              {smsError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{smsError}</div>}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3 text-center">کد تأیید</label>
                <div className="flex justify-center gap-2" dir="ltr">
                  {[0,1,2,3,4].map(i => (
                    <input key={i} type="text" maxLength={1} value={smsCode[i] || ""} autoFocus={i === 0}
                      className="w-14 h-16 border-2 border-slate-200 rounded-xl text-center text-2xl font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                      onChange={e => { const v = e.target.value.replace(/\D/g, ""); const c = smsCode.split(""); c[i] = v; setSmsCode(c.join("").slice(0, 5)); if (v && i < 4) (e.target.nextElementSibling as HTMLInputElement)?.focus(); }}
                      onKeyDown={e => { if (e.key === "Backspace" && !smsCode[i] && i > 0) ((e.target as HTMLElement).previousElementSibling as HTMLInputElement)?.focus(); }} />
                  ))}
                </div>
              </div>
              {countdown > 0 && <p className="text-center text-sm text-slate-500">{Math.floor(countdown/60)}:{String(countdown%60).padStart(2,"0")}</p>}
              <button onClick={verifySmsAndSign} disabled={smsVerifying || smsCode.length !== 5} className="w-full bg-gradient-to-l from-green-600 to-emerald-600 text-white font-bold py-4 rounded-xl disabled:opacity-40 shadow-lg shadow-green-500/30">
                {smsVerifying ? "تأیید..." : "تأیید و ثبت امضا"}
              </button>
              <div className="flex justify-between pt-2 border-t border-slate-100">
                <button onClick={sendSmsCode} disabled={smsSending || countdown > 0} className="text-sm text-blue-600 disabled:text-slate-300">{smsSending ? "ارسال..." : "ارسال مجدد"}</button>
                <button onClick={() => { setShowSmsModal(false); setPendingBlob(null); setPendingPlacements([]); }} className="text-sm text-slate-500 hover:text-red-600">انصراف</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
