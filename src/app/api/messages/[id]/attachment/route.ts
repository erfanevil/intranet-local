import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { verifyToken } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { readFile } from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const url = new URL(request.url);
  const tokenFromQuery = url.searchParams.get("token");
  const authHeader = request.headers.get("authorization");
  const tokenFromHeader = authHeader?.replace("Bearer ", "");
  
  const token = tokenFromQuery || tokenFromHeader;
  
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authUser = await verifyToken(token);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [msg] = await db
    .select()
    .from(messages)
    .where(
      and(
        eq(messages.id, Number(id)),
        eq(messages.receiverId, authUser.id)
      )
    )
    .limit(1);

  if (!msg || !msg.attachmentFilename) {
    return NextResponse.json({ error: "فایل یافت نشد" }, { status: 404 });
  }

  const filePath = path.join(UPLOAD_DIR, msg.attachmentFilename);
  const buffer = await readFile(filePath);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(msg.attachmentOriginalName || 'file')}"`,
      "Content-Length": String(buffer.length),
    },
  });
}
