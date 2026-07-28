import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

export const dynamic = "force-dynamic";

export async function GET() {
  // Try multiple paths
  const paths = [
    path.join(process.cwd(), "public", "uploads", "logo.png"),
    path.join(process.cwd(), "uploads", "logo.png"),
  ];

  for (const filePath of paths) {
    if (existsSync(filePath)) {
      const buffer = await readFile(filePath);
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }
  }

  return new NextResponse(null, { status: 404 });
}
