import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { signatureRequests, users } from "@/db/schema";
import { getAuthFromRequest } from "@/lib/server-auth";
import { eq, desc } from "drizzle-orm";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "documents");

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authUser = await getAuthFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get("type") || "received";

  const senderAlias = {
    id: users.id,
    displayName: users.displayName,
    position: users.position,
    avatar: users.avatar,
  };

  if (type === "sent") {
    const results = await db
      .select({
        id: signatureRequests.id,
        documentOriginalName: signatureRequests.documentOriginalName,
        description: signatureRequests.description,
        status: signatureRequests.status,
        signedAt: signatureRequests.signedAt,
        createdAt: signatureRequests.createdAt,
        signerName: users.displayName,
        signerPosition: users.position,
      })
      .from(signatureRequests)
      .innerJoin(users, eq(signatureRequests.signerId, users.id))
      .where(eq(signatureRequests.senderId, authUser.id))
      .orderBy(desc(signatureRequests.createdAt));

    return NextResponse.json({ requests: results });
  }

  // received requests (need my signature)
  const results = await db
    .select({
      id: signatureRequests.id,
      documentFilename: signatureRequests.documentFilename,
      documentOriginalName: signatureRequests.documentOriginalName,
      signedFilename: signatureRequests.signedFilename,
      description: signatureRequests.description,
      status: signatureRequests.status,
      signedAt: signatureRequests.signedAt,
      createdAt: signatureRequests.createdAt,
      senderName: users.displayName,
      senderPosition: users.position,
    })
    .from(signatureRequests)
    .innerJoin(users, eq(signatureRequests.senderId, users.id))
    .where(eq(signatureRequests.signerId, authUser.id))
    .orderBy(desc(signatureRequests.createdAt));

  return NextResponse.json({ requests: results });
}

export async function POST(request: NextRequest) {
  const authUser = await getAuthFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("document") as File | null;
    const signerId = formData.get("signerId") as string;
    const description = formData.get("description") as string;

    if (!file || !signerId) {
      return NextResponse.json({ error: "فایل و امضاکننده الزامی است" }, { status: 400 });
    }

    await mkdir(UPLOAD_DIR, { recursive: true });

    const ext = path.extname(file.name);
    const filename = `doc_${crypto.randomUUID()}${ext}`;
    const arrayBuffer = await file.arrayBuffer();
    await writeFile(path.join(UPLOAD_DIR, filename), Buffer.from(arrayBuffer));

    const [req] = await db
      .insert(signatureRequests)
      .values({
        documentFilename: filename,
        documentOriginalName: file.name,
        description: description || null,
        senderId: authUser.id,
        signerId: Number(signerId),
        status: "pending",
      })
      .returning();

    return NextResponse.json({ success: true, request: req });
  } catch (error) {
    console.error("Sign request error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
