"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  url: string;
  onImageReady?: (imgUrl: string) => void;
}

export default function PdfViewer({ url, onImageReady }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const render = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch PDF as ArrayBuffer
        const response = await fetch(url);
        if (!response.ok) throw new Error("فایل PDF بارگذاری نشد");
        const arrayBuffer = await response.arrayBuffer();

        // Dynamically load pdf.js
        const pdfjs = await import(/* webpackIgnore: true */ "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs" as string);
        pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";

        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        if (cancelled) return;

        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        await page.render({ canvasContext: ctx, viewport }).promise;

        // Convert canvas to image URL for signing
        const imgUrl = canvas.toDataURL("image/png");
        onImageReady?.(imgUrl);
        setLoading(false);
      } catch (err) {
        console.error("PDF render error:", err);
        if (!cancelled) {
          setError("خطا در رندر PDF. لطفاً فایل را به تصویر تبدیل کنید.");
          setLoading(false);
        }
      }
    };

    render();
    return () => { cancelled = true; };
  }, [url]);

  if (error) {
    return <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-6 text-center text-sm">{error}</div>;
  }

  return (
    <div className="relative">
      {loading && (
        <div className="flex items-center justify-center p-20">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-500 mr-3">در حال بارگذاری PDF...</span>
        </div>
      )}
      <canvas ref={canvasRef} className={`max-w-full block ${loading ? "hidden" : ""}`} />
    </div>
  );
}
