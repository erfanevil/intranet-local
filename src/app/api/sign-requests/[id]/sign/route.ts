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
    if (!signedImage) return NextResponse.json({ error: "تصویر امضا شده الزامی است" }, { status: 400 });

    const [req] = await db.select().from(signatureRequests)
      .where(and(eq(signatureRequests.id, Number(id)), eq(signatureRequests.signerId, authUser.id))).limit(1);
    if (!req) return NextResponse.json({ error: "درخواست یافت نشد" }, { status: 404 });
    if (req.status === "signed") return NextResponse.json({ error: "قبلاً امضا شده" }, { status: 400 });

    const [signerUser] = await db.select({ phone: users.phone, displayName: users.displayName })
      .from(users).where(eq(users.id, authUser.id)).limit(1);

    await mkdir(DOC_DIR, { recursive: true });
    await mkdir(LOG_DIR, { recursive: true });

    const signedImageBuffer = Buffer.from(await signedImage.arrayBuffer());
    const originalExt = path.extname(req.documentFilename).toLowerCase();
    const originalFilePath = path.join(DOC_DIR, req.documentFilename);

    let originalHash = "N/A";
    if (existsSync(originalFilePath)) {
      originalHash = computeHash(await readFile(originalFilePath));
    }

    let signedFilename = "";
    let signedHash = "";

    if (originalExt === ".pdf" && existsSync(originalFilePath)) {
      // Create signed PDF by replacing content with the signed image
      let pdfCreated = false;
      const pdfLib = await loadPdfLib();

      if (pdfLib?.PDFDocument) {
        try {
          // Create a new PDF with the signed image as the only page
          const newPdfDoc = await pdfLib.PDFDocument.create();
          
          // Embed the signed image (PNG from canvas)
          const pngImage = await newPdfDoc.embedPng(signedImageBuffer);
          const imgWidth = pngImage.width;
          const imgHeight = pngImage.height;
          
          // Create a page with the exact image dimensions
          const page = newPdfDoc.addPage([imgWidth, imgHeight]);
          
          // Draw the image to fill the entire page
          page.drawImage(pngImage, {
            x: 0,
            y: 0,
            width: imgWidth,
            height: imgHeight,
          });

          const signedPdfBytes = await newPdfDoc.save();
          signedFilename = `signed_${crypto.randomUUID()}.pdf`;
          const buf = Buffer.from(signedPdfBytes);
          await writeFile(path.join(DOC_DIR, signedFilename), buf);
          signedHash = computeHash(buf);
          pdfCreated = true;
          console.log(`[Sign] Created signed PDF: ${signedFilename}, size: ${buf.length}`);
        } catch (e) {
          console.error("[Sign] PDF creation error:", e);
        }
      }

      if (!pdfCreated) {
        // Fallback: save as PNG
        signedFilename = `signed_${crypto.randomUUID()}.png`;
        await writeFile(path.join(DOC_DIR, signedFilename), signedImageBuffer);
        signedHash = computeHash(signedImageBuffer);
        console.log(`[Sign] Fallback to PNG: ${signedFilename}`);
      }
    } else {
      // Image: save as PNG
      signedFilename = `signed_${crypto.randomUUID()}.png`;
      await writeFile(path.join(DOC_DIR, signedFilename), signedImageBuffer);
      signedHash = computeHash(signedImageBuffer);
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
