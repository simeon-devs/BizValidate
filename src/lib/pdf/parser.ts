import { env } from "@/lib/env";
import { AppError } from "@/lib/utils/errors";

const OCR_ENDPOINT = "https://api.mistral.ai/v1/ocr";
const OCR_MODEL = "mistral-ocr-latest";

const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

interface OcrPage {
  markdown: string;
}

interface OcrResponse {
  pages: OcrPage[];
}

// Extracts text from a PDF/DOCX buffer via Mistral OCR (free tier).
// Plain-text files never reach this — they're decoded directly at upload.
export async function extractDocumentText(
  buffer: Buffer,
  fileName: string,
): Promise<string> {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const mime = MIME_BY_EXT[ext];
  if (!mime) {
    throw new AppError(`Unsupported document type: .${ext}`, "bad_type");
  }

  const dataUrl = `data:${mime};base64,${buffer.toString("base64")}`;

  const res = await fetch(OCR_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.MISTRAL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OCR_MODEL,
      document: { type: "document_url", document_url: dataUrl },
    }),
  });

  if (!res.ok) {
    throw new AppError(
      `Document parsing failed (${res.status})`,
      "ocr_failed",
    );
  }

  const data = (await res.json()) as OcrResponse;
  const text = data.pages
    .map((p) => p.markdown)
    .join("\n\n")
    .trim();

  if (!text) {
    throw new AppError("No text found in the document.", "ocr_empty");
  }
  return text;
}
