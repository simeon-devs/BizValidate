import type { EnrichmentSource } from "@/types/report";

// The scorer is asked to list the specific facts each score rests on. That
// list is only worth printing if it is true, so every item is checked here
// against the submission text and the cited sources — in code, not by the
// model — and unsupported items are dropped. Same posture as the citation
// validator: more content must not mean more places to be wrong.

const STOP_WORDS = new Set([
  "that", "this", "with", "from", "they", "their", "have", "been", "were",
  "which", "there", "these", "those", "than", "then", "into", "over",
  "also", "such", "only", "more", "most", "very", "some", "each", "when",
  "where", "while", "about", "after", "before", "under", "between", "within",
  "would", "could", "should", "will", "does", "just", "both", "being",
  "founder", "founders", "business", "company", "submission",
]);

const MIN_SUPPORT_RATIO = 0.6;

export interface EvidenceCheck {
  kept: string[];
  dropped: string[];
}

// Content words: 4+ letters excluding stop words, plus any token that
// carries a number or currency (those are the facts that matter most).
function contentWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/\[s\d+\]/g, " ")
    .split(/[^a-z0-9$€£%.,'-]+/)
    .map((w) => w.replace(/^[.,'-]+|[.,'-]+$/g, ""))
    .filter((w) => {
      if (!w) return false;
      if (/\d/.test(w)) return true;
      return w.length >= 4 && !STOP_WORDS.has(w);
    });
}

function citedIds(item: string): number[] {
  return [...item.matchAll(/\[S(\d+)\]/gi)].map((m) => Number(m[1]));
}

// An item is supported when enough of its content words appear in the
// haystack AND every number in it does. Numbers are the part of a fact
// most worth checking: "999 tonnes" must not pass because "tonnes" did.
function isSupported(item: string, haystack: string): boolean {
  const words = contentWords(item);
  if (words.length === 0) return false;
  const numbers = words.filter((w) => /\d/.test(w));
  if (numbers.some((n) => !haystack.includes(n))) return false;
  const hits = words.filter((w) => haystack.includes(w)).length;
  return hits / words.length >= MIN_SUPPORT_RATIO;
}

export function validateEvidence(
  items: string[] | undefined,
  submissionText: string,
  sources: EnrichmentSource[],
): EvidenceCheck {
  const kept: string[] = [];
  const dropped: string[] = [];
  if (!items || items.length === 0) return { kept, dropped };

  const submission = submissionText.toLowerCase();
  const sourceText = new Map(
    sources.map((s) => [s.id, `${s.title} ${s.snippet}`.toLowerCase()]),
  );
  const allSources = [...sourceText.values()].join(" ");

  for (const raw of items) {
    const item = raw.trim();
    if (!item) continue;
    const ids = citedIds(item);
    const haystacks = [submission];
    if (ids.length > 0) {
      for (const id of ids) {
        const text = sourceText.get(id);
        if (text) haystacks.push(text);
      }
    } else {
      haystacks.push(allSources);
    }
    const supported = haystacks.some((h) => isSupported(item, h));
    (supported ? kept : dropped).push(item);
  }
  return { kept, dropped };
}
