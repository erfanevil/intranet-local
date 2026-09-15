import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { signatureRequests, users } from "@/db/schema";
import { getAuthFromRequest } from "@/lib/server-auth";
import { eq, and } from "drizzle-orm";
import { writeFile, mkdir, readFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { existsSync } from "fs";

const DOC_DIR = path.join(process.cwd(), "uploads", "documents");
const LOG_DIR = path.join(process.cwd(), "uploads", "documents", "logs");

export const dynamic = "force-dynamic";

function computeHash(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function shamsiDate(): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("fa-IR-u-nu-latn", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false, timeZone: "Asia/Tehran",
  }).formatToParts(now);
  const get = (t: string) => parts.find(p => p.type === t)?.value || "";
  return `${get("year")}/${get("month")}/${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
}

function getClientIP(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0].trim()
    || request.headers.get("x-real-ip")
    || "unknown";
}

// Dynamic import for pdf-lib (from npm package)
async function loadPdfLib() {
  try {
    const pdfLib = await import("pdf-lib");
    return pdfLib;
  } catch (e) {
    console.error("[Sign] Failed to load pdf-lib:", e);
    return null;
  }
}

interface Placement {
  page: number;   // 1-based page number
  xPct: number;   // fraction of page width
  yPct: number;   // fraction of page height (from top)
  wPct: number;   // signature width as fraction of page width
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthFromRequest(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const clientIP = getClientIP(request);

  try {
    const formData = await request.formData();
    const signedImage = formData.get("signedImage") as File | null;
    const signatureFile = formData.get("signature") as File | null;
    const placementsRaw = formData.get("placements");

    if (!signedImage && !(signatureFile && placementsRaw)) {
      return NextResponse.json({ error: "تصویر امضا شده یا اطلاعات مکان امضا الزامی است" }, { status: 400 });
    }

    const [req] = await db.select().from(signatureRequests)
      .where(and(eq(signatureRequests.id, Number(id)), eq(signatureRequests.signerId, authUser.id))).limit(1);
    if (!req) return NextResponse.json({ error: "درخواست یافت نشد" }, { status: 404 });
    if (req.status === "signed") return NextResponse.json({ error: "قبلاً امضا شده" }, { status: 400 });

    const [signerUser] = await db.select({ phone: users.phone, displayName: users.displayName })
      .from(users).where(eq(users.id, authUser.id)).limit(1);

    await mkdir(DOC_DIR, { recursive: true });
    await mkdir(LOG_DIR, { recursive: true });

    const originalExt = path.extname(req.documentFilename).toLowerCase();
    const originalFilePath = path.join(DOC_DIR, req.documentFilename);

    let originalHash = "N/A";
    let originalBytes: Buffer | null = null;
    if (existsSync(originalFilePath)) {
      originalBytes = await readFile(originalFilePath);
      originalHash = computeHash(originalBytes);
    }

    let signedFilename = "";
    let signedHash = "";
    let signedPagesLabel = "1";

    // ─────────────────────────────────────────────────────────────
    // Flow A (multi-page PDF): raw signature + per-page placements.
    // The signature is drawn onto the ORIGINAL PDF pages, so every
    // page (signed or not) is preserved with its original quality.
    // ─────────────────────────────────────────────────────────────
    let flowADone = false;
    if (
      !flowADone &&
      signatureFile &&
      typeof placementsRaw === "string" &&
      placementsRaw.length > 0 &&
      originalExt === ".pdf" &&
      originalBytes
    ) {
      try {
        let placements = JSON.parse(placementsRaw) as Placement[];
        if (!Array.isArray(placements)) placements = [];
        placements = placements
          .filter(p => p && Number.isInteger(p.page) && p.page >= 1)
          .map(p => ({ page: p.page, xPct: clamp01(p.xPct), yPct: clamp01(p.yPct), wPct: Math.max(0.02, Math.min(0.95, Number(p.wPct) || 0.2)) }));

        if (placements.length === 0) throw new Error("no valid placements");

        const pdfLib = await loadPdfLib();
        if (!pdfLib?.PDFDocument) throw new Error("pdf-lib unavailable");

        const pdfDoc = await pdfLib.PDFDocument.load(originalBytes, { ignoreEncryption: true });
        const sigBytes = Buffer.from(await signatureFile.arrayBuffer());

        // Detect PNG vs JPEG by magic bytes
        const isPng = sigBytes.length > 2 && sigBytes[0] === 0x89 && sigBytes[1] === 0x50;
        const sigImage = isPng ? await pdfDoc.embedPng(sigBytes) : await pdfDoc.embedJpg(sigBytes);
        const sigAspect = sigImage.height / sigImage.width;

        const pages = pdfDoc.getPages();
        const appliedPages: number[] = [];

        for (const pl of placements) {
          const idx = pl.page - 1;
          if (idx < 0 || idx >= pages.length) continue;
          const page = pages[idx];
          const { width, height } = page.getSize();

          const sigW = pl.wPct * width;
          const sigH = sigW * sigAspect;
          const x = Math.min(pl.xPct * width, width - sigW);
          // client yPct is measured from the top; pdf-lib origin is bottom-left
          const y = height - pl.yPct * height - sigH;
          const clampedY = Math.max(0, Math.min(y, height - sigH));

          page.drawImage(sigImage, { x: Math.max(0, x), y: clampedY, width: sigW, height: sigH });
          appliedPages.push(pl.page);
        }

        if (appliedPages.length === 0) throw new Error("no pages matched placements");

        const signedPdfBytes = await pdfDoc.save();
        signedFilename = `signed_${crypto.randomUUID()}.pdf`;
        const buf = Buffer.from(signedPdfBytes);
        await writeFile(path.join(DOC_DIR, signedFilename), buf);
        signedHash = computeHash(buf);
        signedPagesLabel = appliedPages.sort((a, b) => a - b).join(", ");
        flowADone = true;
        console.log(`[Sign] Overlaid signature on pages [${signedPagesLabel}] of original PDF → ${signedFilename}`);
      } catch (e) {
        console.error("[Sign] Multi-page overlay failed, falling back:", e);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // Flow B (image documents & fallback): a pre-composited image
    // arrives from the client (canvas). Old single-image behaviour.
    // ─────────────────────────────────────────────────────────────
    if (!flowADone) {
      if (!signedImage) {
        return NextResponse.json({ error: "تصویر امضا شده الزامی است" }, { status: 400 });
      }
      const signedImageBuffer = Buffer.from(await signedImage.arrayBuffer());

      if (originalExt === ".pdf" && originalBytes) {
        // Legacy fallback: wrap the composited page image in a PDF
        let pdfCreated = false;
        const pdfLib = await loadPdfLib();

        if (pdfLib?.PDFDocument) {
          try {
            const newPdfDoc = await pdfLib.PDFDocument.create();
            const pngImage = await newPdfDoc.embedPng(signedImageBuffer);
            const imgWidth = pngImage.width;
            const imgHeight = pngImage.height;
            const page = newPdfDoc.addPage([imgWidth, imgHeight]);
            page.drawImage(pngImage, { x: 0, y: 0, width: imgWidth, height: imgHeight });

            const signedPdfBytes = await newPdfDoc.save();
            signedFilename = `signed_${crypto.randomUUID()}.pdf`;
            const buf = Buffer.from(signedPdfBytes);
            await writeFile(path.join(DOC_DIR, signedFilename), buf);
            signedHash = computeHash(buf);
            pdfCreated = true;
          } catch (e) {
            console.error("[Sign] PDF creation error:", e);
          }
        }

        if (!pdfCreated) {
          signedFilename = `signed_${crypto.randomUUID()}.png`;
          await writeFile(path.join(DOC_DIR, signedFilename), signedImageBuffer);
          signedHash = computeHash(signedImageBuffer);
        }
      } else {
        signedFilename = `signed_${crypto.randomUUID()}.png`;
        await writeFile(path.join(DOC_DIR, signedFilename), signedImageBuffer);
        signedHash = computeHash(signedImageBuffer);
      }
    }

    await db.update(signatureRequests)
      .set({ status: "signed", signedFilename, signedAt: new Date() })
      .where(eq(signatureRequests.id, Number(id)));

    // Log
    const logEntry = [
      `════════════════════════════════════════════════════`,
      `  گزارش امضای الکترونیک — شهرداری لاهیجان`,
      `════════════════════════════════════════════════════`,
      `  Document       : ${req.documentOriginalName}`,
      `  Signer         : ${signerUser?.displayName || authUser.displayName} (${authUser.username})`,
      `  Action         : Digital Signature Applied`,
      `  Pages Signed   : ${signedPagesLabel}${flowADone ? " (original PDF preserved)" : ""}`,
      `  Authentication : SMS OTP Verified`,
      `  Mobile         : ${signerUser?.phone || "N/A"}`,
      `  IP Address     : ${clientIP}`,
      `  Date           : ${shamsiDate()}`,
      `  PDF Hash Before: ${originalHash}`,
      `  PDF Hash After : ${signedHash}`,
      `  Status         : SIGNED`,
      `  Request ID     : ${req.id}`,
      `  Signed File    : ${signedFilename}`,
      `════════════════════════════════════════════════════`,
    ].join("\n");

    await writeFile(path.join(LOG_DIR, `sign_log_${req.id}.txt`), logEntry, "utf-8");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Sign error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
