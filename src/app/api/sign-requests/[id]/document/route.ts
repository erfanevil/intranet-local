import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { signatureRequests } from "@/db/schema";
import { verifyToken } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { readFile } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

const DOC_DIR = path.join(process.cwd(), "uploads", "documents");

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const authUser = await verifyToken(token);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [req] = await db.select().from(signatureRequests).where(eq(signatureRequests.id, Number(id))).limit(1);
  if (!req) return NextResponse.json({ error: "یافت نشد" }, { status: 404 });

  const isSigned = url.searchParams.get("signed") === "true" && req.signedFilename;
  const filename = isSigned ? req.signedFilename! : req.documentFilename;
  const filePath = path.join(DOC_DIR, filename);

  if (!existsSync(filePath)) {
    return NextResponse.json({ error: "فایل یافت نشد" }, { status: 404 });
  }

  const buffer = await readFile(filePath);
  const ext = path.extname(filename).toLowerCase();

  const mimeMap: Record<string, string> = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };

  const mime = mimeMap[ext] || "application/octet-stream";
  const disposition = isSigned ? "attachment" : "inline";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `${disposition}; filename="${encodeURIComponent(isSigned ? `signed_${req.documentOriginalName}` : req.documentOriginalName)}"`,
      "Content-Length": String(buffer.length),
    },
  });
}
