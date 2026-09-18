import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/server-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_SIZE = 25 * 1024 * 1024; // 25MB

export async function POST(request: NextRequest) {
  const authUser = await getAuthFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "فایلی ارسال نشده است" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "حجم فایل بیش از حد مجاز است (۲۵ مگابایت)" }, { status: 400 });
    }

    const name = file.name.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());
    let text = "";

    if (name.endsWith(".docx")) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (name.endsWith(".doc")) {
      const WordExtractor = (await import("word-extractor")).default;
      const extractor = new WordExtractor();
      const doc = await extractor.extract(buffer);
      text = doc.getBody();
    } else {
      return NextResponse.json({ error: "فقط فایل‌های Word پشتیبانی می‌شوند (docx / doc)" }, { status: 400 });
    }

    if (!text.trim()) {
      return NextResponse.json({ error: "متنی در فایل یافت نشد" }, { status: 400 });
    }

    return NextResponse.json({ text });
  } catch (err) {
    console.error("Convert text error:", err);
    return NextResponse.json({ error: "خطا در پردازش فایل. لطفاً فایل دیگری امتحان کنید." }, { status: 500 });
  }
}
