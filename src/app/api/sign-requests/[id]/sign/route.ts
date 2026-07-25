import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { signatureRequests } from "@/db/schema";
import { getAuthFromRequest } from "@/lib/server-auth";
import { eq, and } from "drizzle-orm";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

const DOC_DIR = path.join(process.cwd(), "uploads", "documents");

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const formData = await request.formData();
    const signedImage = formData.get("signedImage") as File | null;

    if (!signedImage) {
      return NextResponse.json({ error: "تصویر امضا شده الزامی است" }, { status: 400 });
    }

    const [req] = await db
      .select()
      .from(signatureRequests)
      .where(
        and(
          eq(signatureRequests.id, Number(id)),
          eq(signatureRequests.signerId, authUser.id)
        )
      )
      .limit(1);

    if (!req) {
      return NextResponse.json({ error: "درخواست یافت نشد" }, { status: 404 });
    }

    if (req.status === "signed") {
      return NextResponse.json({ error: "این نامه قبلاً امضا شده" }, { status: 400 });
    }

    await mkdir(DOC_DIR, { recursive: true });

    const signedFilename = `signed_${crypto.randomUUID()}.png`;
    const arrayBuffer = await signedImage.arrayBuffer();
    await writeFile(path.join(DOC_DIR, signedFilename), Buffer.from(arrayBuffer));

    await db
      .update(signatureRequests)
      .set({
        status: "signed",
        signedFilename,
        signedAt: new Date(),
      })
      .where(eq(signatureRequests.id, Number(id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Sign error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
