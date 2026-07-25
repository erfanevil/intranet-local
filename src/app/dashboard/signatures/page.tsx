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

export default function SignaturesPage() {
  const [tab, setTab] = useState<"received" | "sent">("received");
  const [reqs, setReqs] = useState<SignReq[]>([]);
  const [loading, setLoading] = useState(true);

  const [signingId, setSigningId] = useState<number | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [sigUrl, setSigUrl] = useState<string | null>(null);
  const [sigPos, setSigPos] = useState({ x: 40, y: 180 });
  const [sigSize, setSigSize] = useState(140);
  const [dragging, setDragging] = useState(false);
  const [dragOff, setDragOff] = useState({ x: 0, y: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [pdfImageUrl, setPdfImageUrl] = useState<string | null>(null);

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

  useEffect(() => { if (countdown <= 0) return; const t = setTimeout(() => setCountdown(c => c - 1), 1000); return () => clearTimeout(t); }, [countdown]);

  const load = async () => { setLoading(true); const res = await authFetch(`/api/sign-requests?type=${tab}`); const data = await res.json(); setReqs(data.requests || []); setLoading(false); };
  useEffect(() => { load(); }, [tab]);

  // Render PDF page 1 to image using pdf.js from CDN
  const loadPdfAsImage = useCallback(async (docId: number) => {
    const token = getToken();
    try {
      // Fetch PDF binary
      const res = await fetch(`/api/sign-requests/${docId}/pdf-image?token=${token}`);
      if (!res.ok) return;
      const arrayBuffer = await res.arrayBuffer();

      // Load pdf.js from local files
      // @ts-expect-error dynamic import from public folder
      const pdfjs = await import(/* webpackIgnore: true */ "/js/pdf.min.mjs");
      pdfjs.GlobalWorkerOptions.workerSrc = "/js/pdf.worker.min.mjs";

      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 2.0 });

      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      await page.render({ canvasContext: ctx, viewport }).promise;
      const imgUrl = canvas.toDataURL("image/png");
      setPdfImageUrl(imgUrl);
    } catch (err) {
      console.error("PDF render error:", err);
    }
  }, []);

  const openSign = async (r: SignReq) => {
    const token = getToken(); setSigningId(r.id); setSigPos({ x: 40, y: 180 }); setSigSize(140); setPdfImageUrl(null);
    const [pRes, sRes] = await Promise.all([fetch(`/api/sign-requests/${r.id}/preview?token=${token}`), fetch(`/api/sign-requests/${r.id}/my-signature?token=${token}`)]);
    const previewData = await pRes.json();
    setPreview(previewData); setSigUrl(sRes.ok ? `/api/sign-requests/${r.id}/my-signature?token=${token}` : null);
    if (previewData.mode === "pdf") { loadPdfAsImage(r.id); }
  };

  const closeSign = () => { setSigningId(null); setPreview(null); setSigUrl(null); setPendingBlob(null); setShowSmsModal(false); setSmsCode(""); setSmsError(""); if (pdfImageUrl) URL.revokeObjectURL(pdfImageUrl); setPdfImageUrl(null); };

  const handleMouseDown = (e: React.MouseEvent) => { const rect = wrapperRef.current?.getBoundingClientRect(); if (!rect) return; setDragging(true); setDragOff({ x: e.clientX - sigPos.x - rect.left, y: e.clientY - sigPos.y - rect.top }); };
  const handleMouseMove = (e: React.MouseEvent) => { if (!dragging || !wrapperRef.current) return; const r = wrapperRef.current.getBoundingClientRect(); setSigPos({ x: Math.max(0, Math.min(e.clientX - r.left - dragOff.x, r.width - sigSize)), y: Math.max(0, Math.min(e.clientY - r.top - dragOff.y, r.height - sigSize)) }); };
  const handleTouchStart = (e: React.TouchEvent) => { const rect = wrapperRef.current?.getBoundingClientRect(); if (!rect) return; const t = e.touches[0]; setDragging(true); setDragOff({ x: t.clientX - sigPos.x - rect.left, y: t.clientY - sigPos.y - rect.top }); };
  const handleTouchMove = (e: React.TouchEvent) => { if (!dragging || !wrapperRef.current) return; const r = wrapperRef.current.getBoundingClientRect(); const t = e.touches[0]; setSigPos({ x: Math.max(0, Math.min(t.clientX - r.left - dragOff.x, r.width - sigSize)), y: Math.max(0, Math.min(t.clientY - r.top - dragOff.y, r.height - sigSize)) }); };

  const sendSmsCode = async () => { setSmsSending(true); setSmsError(""); try { const res = await authFetch("/api/sms/send-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ signRequestId: signingId }) }); const data = await res.json(); if (!res.ok) throw new Error(data.error); setCountdown(120); } catch (err) { setSmsError(err instanceof Error ? err.message : "خطا"); } finally { setSmsSending(false); } };

  const handleConfirm = async () => {
    if (!preview || !sigUrl || !wrapperRef.current) return;
    setSubmitting(true);
    try {
      const sigImg = new Image(); sigImg.crossOrigin = "anonymous";
      await new Promise<void>((res, rej) => { sigImg.onload = () => res(); sigImg.onerror = () => rej(new Error("خطا")); sigImg.src = sigUrl; });

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("خطا");
      const wrapRect = wrapperRef.current.getBoundingClientRect();

      // Use the correct source image
      const sourceImg = preview.mode === "pdf" ? pdfImgRef.current : imageRef.current;
      if (!sourceImg) throw new Error("سند آماده نیست. لطفاً صبر کنید.");

      canvas.width = sourceImg.naturalWidth; canvas.height = sourceImg.naturalHeight;
      ctx.drawImage(sourceImg, 0, 0);
      const sx = sourceImg.naturalWidth / wrapRect.width;
      const sy = sourceImg.naturalHeight / wrapRect.height;
      const dw = sigSize * sx;
      const dh = (sigSize * (sigImg.naturalHeight / sigImg.naturalWidth)) * sy;
      ctx.drawImage(sigImg, sigPos.x * sx, sigPos.y * sy, dw, dh);

      const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, "image/png"));
      if (!blob) throw new Error("خطا");
      setPendingBlob(blob); setSmsCode(""); setSmsError(""); setShowSmsModal(true);
      await sendSmsCode();
    } catch (err) { alert(err instanceof Error ? err.message : "خطا"); }
    finally { setSubmitting(false); }
  };

  const verifySmsAndSign = async () => {
    if (!smsCode.trim() || !pendingBlob || !signingId) return; setSmsVerifying(true); setSmsError("");
    try {
      const vRes = await authFetch("/api/sms/verify-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: smsCode.trim() }) });
      if (!vRes.ok) throw new Error((await vRes.json()).error);
      const fd = new FormData(); fd.append("signedImage", pendingBlob, "signed.png");
      const sRes = await fetch(`/api/sign-requests/${signingId}/sign`, { method: "POST", headers: { Authorization: `Bearer ${getToken()}` }, body: fd });
      if (!sRes.ok) throw new Error((await sRes.json()).error);
      closeSign(); load();
    } catch (err) { setSmsError(err instanceof Error ? err.message : "خطا"); } finally { setSmsVerifying(false); }
  };

  const dlSigned = (r: SignReq) => window.open(`/api/sign-requests/${r.id}/document?token=${getToken()}&signed=true`, "_blank");
  const dlDoc = (r: SignReq) => window.open(`/api/sign-requests/${r.id}/document?token=${getToken()}`, "_blank");
  const delReq = async (r: SignReq) => { if (!confirm("حذف درخواست؟")) return; const res = await authFetch(`/api/sign-requests/${r.id}`, { method: "DELETE" }); if (res.ok) setReqs(p => p.filter(x => x.id !== r.id)); };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  const isSignable = preview && (preview.mode === "image" || (preview.mode === "pdf" && pdfImageUrl)) && sigUrl;

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
                <button onClick={() => delReq(r)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
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
              <h2 className="text-base font-bold text-slate-800">امضای سند {preview.mode === "pdf" && <span className="text-xs text-slate-500 font-normal">(صفحه اول)</span>}</h2>
              <div className="flex items-center gap-3">
                <label className="text-xs text-slate-600">اندازه:</label>
                <input type="range" min="40" max="500" value={sigSize} onChange={e => setSigSize(Number(e.target.value))} className="w-32" />
                <button onClick={closeSign} className="p-2 hover:bg-slate-200 rounded-lg"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-slate-100 flex items-start justify-center">
              <div ref={wrapperRef} className="relative bg-white shadow-lg max-w-full" style={{ cursor: dragging ? "grabbing" : "default" }}
                onMouseMove={handleMouseMove} onMouseUp={() => setDragging(false)} onMouseLeave={() => setDragging(false)} onTouchMove={handleTouchMove} onTouchEnd={() => setDragging(false)}>

                {preview.mode === "image" && <img ref={imageRef} src={preview.url} alt={preview.filename} className="max-w-full block" draggable={false} crossOrigin="anonymous" />}

                {preview.mode === "pdf" && pdfImageUrl && <img ref={pdfImgRef} src={pdfImageUrl} alt={preview.filename} className="max-w-full block" draggable={false} />}

                {preview.mode === "pdf" && !pdfImageUrl && (
                  <div className="flex items-center justify-center p-20"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /><span className="text-sm text-slate-500 mr-3">در حال تبدیل PDF...</span></div>
                )}

                {sigUrl && (preview.mode === "image" || pdfImageUrl) && (
                  <div style={{ position: "absolute", left: sigPos.x, top: sigPos.y, width: sigSize, cursor: "grab", touchAction: "none" }} onMouseDown={handleMouseDown} onTouchStart={handleTouchStart}>
                    <img src={sigUrl} alt="امضا" style={{ width: "100%", opacity: 0.9 }} draggable={false} />
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow" />
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs text-slate-500">امضا را بکشید روی محل مناسب</p>
              <div className="flex gap-3">
                <button onClick={closeSign} className="px-5 py-2.5 border-2 border-slate-200 rounded-xl hover:bg-slate-50 text-sm">انصراف</button>
                <button onClick={handleConfirm} disabled={submitting || !isSignable} className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl disabled:opacity-50 font-medium text-sm shadow-lg shadow-green-500/25">
                  {submitting ? "صبر کنید..." : "تأیید و ارسال کد"}
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
                <button onClick={() => { setShowSmsModal(false); setPendingBlob(null); }} className="text-sm text-slate-500 hover:text-red-600">انصراف</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
