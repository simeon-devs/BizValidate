import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { uploadObject } from "@/lib/storage/r2";
import { extractDocumentText } from "@/lib/pdf/parser";
import { isAppError } from "@/lib/utils/errors";

const MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "Not signed in.", code: "unauthorized" },
      { status: 401 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "No file provided.", code: "missing_file" },
      { status: 400 },
    );
  }

  const extOk = /\.(pdf|txt|docx)$/i.test(file.name);
  if (!ALLOWED_TYPES.has(file.type) && !extOk) {
    return NextResponse.json(
      { error: "Unsupported file type. Use PDF, TXT, or DOCX.", code: "bad_type" },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File exceeds the 5MB limit.", code: "too_large" },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  const key = `${userId}/${randomUUID()}-${safeName}`;

  try {
    const fileUrl = await uploadObject(
      key,
      buffer,
      file.type || "application/octet-stream",
    );

    // Plain text decodes directly; PDF/DOCX go through Mistral OCR.
    const extractedText = /\.txt$/i.test(file.name)
      ? buffer.toString("utf-8")
      : await extractDocumentText(buffer, file.name);

    return NextResponse.json({ fileUrl, extractedText });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 422 },
      );
    }
    return NextResponse.json(
      { error: "Upload failed. Try again.", code: "upload_failed" },
      { status: 500 },
    );
  }
}
