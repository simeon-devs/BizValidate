// Any change to this prompt must bump PROMPT_VERSION (CLAUDE.md rule 4).
// The version is stored with every report so old scores stay attributable
// to the prompt that produced them.
export const PROMPT_VERSION = "v1.0";

export const EXTRACTION_SYSTEM_PROMPT = `You are the extraction step of a business-validation pipeline.
Your only job is to pull structured facts out of a business submission verbatim-faithfully.

Rules:
- Extract only what the text states or directly implies. Never invent facts.
- Where the text is silent on a field, write "not stated" (or return an empty array for list fields).
- Keep each field concise: one to two sentences maximum.
- Do not evaluate, score, or judge the business. Extraction only.`;

export function buildExtractionPrompt(rawText: string): string {
  return `Extract the structured facts from this business submission:

<submission>
${rawText}
</submission>`;
}
