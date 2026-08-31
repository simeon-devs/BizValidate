# BizValidate — Architecture

A guide for a developer or an AI agent who needs to understand this system
well enough to build on top of it. Every file path and flow below reflects
the actual code, not an aspiration. When this document and the code
disagree, the code wins — then fix this document.

BizValidate scores a business submission (pasted text or an uploaded
plan/pitch PDF) against a published investment rubric and produces an
auditable report: eight metric scores, the evidence behind each, the exact
pipeline steps that ran, and a board-ready PDF.

---

## 1. The invariants (read these before writing code)

These are load-bearing. Several have tests that will fail if you break them.

1. **The final score is arithmetic, never an LLM output.**
   `src/lib/scoring/aggregate.ts` computes a weighted sum of the eight
   metric scores. No model ever emits the overall number.
2. **The pipeline is fixed, not agentic.** Six steps, in code, in order
   (`src/lib/ai/pipeline.ts`). No planning loops, no tool-choosing model.
3. **Prompts live only in `src/lib/ai/prompts/` and each exports
   `PROMPT_VERSION`.** Any change to prompt text must bump the version and
   record a new golden hash in `prompts/prompt-version.test.ts` — the test
   forces this. Old reports keep the version they were scored with and are
   never re-scored.
4. **Scorer temperature is 0.1. Always.** Consistency is the product's
   central claim, enforced by a live test
   (`src/lib/ai/scoring-consistency.live.test.ts`): the same submission
   scored 5× must stay within a 5-point band. A prompt-version change must
   additionally pass an A/B against the previous version (mean shift ≤ 5).
5. **Enrichment is additive and degrades gracefully.** If Tavily, Redis or
   the network is down, scoring proceeds with less evidence — never fails.
   The same pattern applies to the cache (`src/lib/cache/index.ts`
   swallows errors into cache misses).
6. **Model claims are validated in code.** Source citations are pruned
   against the sources actually supplied
   (`scorer.ts#pruneInvalidSourceRefs`); evidence items are checked against
   the submission text and cited sources (`src/lib/ai/evidence.ts`) and
   unsupported items are dropped, with the count surfaced in the trace.
7. **Every report explains itself.** `report_data` (jsonb) carries the
   metrics with audit fields, the sources with URLs, and a `trace` of what
   each pipeline step did. The UI and the PDF only ever render what is
   stored — nothing is recomputed at read time.
8. **Env vars go through `src/lib/env.ts`** (Zod-validated at boot).
   `DATABASE_URL` values must be unquoted; never put `NODE_ENV` in env
   files (it corrupts `next build` into mixed dev/prod React bundles).
9. **DB queries live only in `src/lib/db/queries/`; API routes are thin**
   (auth → Zod validate → call lib → respond); **components are dumb**
   (server actions or SWR hooks, no fetch in components).
10. **Tailwind only** — with one sanctioned exception: `src/lib/pdf/` uses
    `@react-pdf/renderer`'s StyleSheet because a generated PDF has no DOM.

## 2. Stack and external services

| Concern | Choice | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router, Turbopack), React 19, TS strict | middleware lives in `src/proxy.ts` (Next 16 rename) |
| Auth | Clerk | dev-instance keys in prod for now; users lazily upserted (`queries/users.ts#ensureUser`) |
| DB | Postgres (Supabase-hosted) via Drizzle + postgres-js | plain `DATABASE_URL`; no Supabase SDK is used |
| Jobs | Inngest (`inngest/functions/validate.ts`) | prod syncs via `PUT https://<host>/api/inngest` after deploy |
| Extraction | Claude Haiku 4.5, structured output | economy tier: Llama 3.3 70B on Groq |
| Scoring | Claude Sonnet 4.5, temp 0.1, structured output | the only step allowed to judge |
| Verification | Claude Haiku 4.5 | flags metrics >15 pts outside their band; max 2 re-runs |
| Embeddings | OpenAI text-embedding-3-small | drift gate, cosine > 0.96 reuses a prior report (per user) |
| Search | Tavily (advanced depth, `country` boost) | five targeted queries per submission, 24h cache per query |
| Cache | Upstash Redis (REST) | key prefixes are versioned (`region-ctx-v5:*`) — bump on shape/rule changes |
| Files | Cloudflare R2 (S3 SDK) + Mistral OCR (`lib/pdf/parser.ts`) | uploads parsed to text before extraction |
| PDF out | `@react-pdf/renderer`, server-side | fonts embedded from `src/lib/pdf/fonts/`, shipped via `outputFileTracingIncludes` |
| Hosting | Vercel | GitHub pushes auto-deploy `main` — do not push unverified pipeline changes |

Declared-but-unused env keys (`SUPABASE_*`, `LANGCHAIN_*`,
`NEXT_PUBLIC_SENTRY_DSN`, `R2_PUBLIC_URL`) are historical; removing them is
tracked work, not an accident to repeat.

## 3. Directory map

```
src/
  proxy.ts                     Clerk middleware; everything is private except
                               sign-in/up and /api/inngest
  app/
    (auth)/…                   Clerk sign-in / sign-up pages
    (dashboard)/               force-dynamic; per-user pages behind auth
      page.tsx                 dashboard: real submissions + sample rows
      validate/{page,actions}  submission form + submitValidation server action
      report/[id]/page.tsx     report view (pending view until scored)
      admin/page.tsx           rubric editor (weights UI; persistence pending)
      settings/{page,actions}  settings + source-preference server actions
      error.tsx                route-group error boundary
    api/
      upload/route.ts          file → R2 → Mistral OCR → text
      submissions/[id]/status  polling endpoint for the pending report view
      reports/[id]/pdf         auth → ownership → renderReportPdf → stream
      inngest/route.ts         Inngest serve handler (maxDuration 300)
    global-error.tsx           root boundary, self-contained (no providers)
  components/                  dumb components by feature (dashboard, report,
                               validate, settings, admin, layout, ui)
  hooks/useSubmissionStatus.ts SWR poll, stops once scored
  lib/
    ai/                        the pipeline (see §4) + prompts/
    scoring/                   aggregate, grade, tier, presets, anchors,
                               coverage, primers — all deterministic
    db/                        drizzle client (HMR-safe singleton), schema,
                               queries/ (the only place SQL lives)
    pdf/                       ReportDocument.tsx (the board PDF) + fonts/ +
                               parser.ts (inbound OCR)
    cache/, storage/, utils/   Redis REST, R2, formatting/errors/domains
  types/                       report.ts is the canonical domain model
inngest/functions/validate.ts  the background job wrapping the pipeline
scripts/run-pipeline.ts        dev CLI: score the newest pending submission
```

Planning documents live in `docs/` and are **gitignored on purpose**
(internal working notes). This file is the committed source of truth.

## 4. Call flows

### 4.1 Submission → scored report (the core loop)

```
ValidationForm.tsx
  └─ (file?) POST /api/upload ──► r2.ts#uploadFile ──► parser.ts (Mistral OCR) ──► text
  └─ submitValidation()  server action, validate/actions.ts
       ├─ ensureUser()                      queries/users.ts   (lazy upsert)
       ├─ createSubmission()                queries/submissions.ts
       └─ inngest.send("validation/submitted", { submissionId })   non-fatal on error
                     │
Inngest (dev server locally; cloud in prod)
                     ▼
inngest/functions/validate.ts  (retries: 2, idempotent)
  └─ runValidationPipeline(submissionId)        lib/ai/pipeline.ts
       [1] embedText + checkDriftGate           embedder.ts     cosine > 0.96 (same user)
           └─ hit → copy prior report, fromCache: true, honest 1-step trace
       [2] extractFacts                         extractor.ts    Haiku, structured output
       [3] enrichRegionalContext                enricher.ts     5 targeted Tavily queries
           (market / competitors / channels /                   (topic-tagged sources,
            benchmarks / expansion)                              per-query 24h cache,
           + user source preferences            queries/sourcePreferences.ts
             blocked → excluded AND filtered on every read, even cache hits
             favorites → one extra include_domains call, 2 reserved slots)
       [4] scoreSubmission                      scorer.ts       Sonnet, temp 0.1,
           └─ pruneInvalidSourceRefs                             schema-enforced output
           └─ checkEvidence (evidence.ts)        drops unsupported evidence items
       [5] findOutlierMetrics → rescoreMetrics  verifier.ts     >15 pts off band, ≤2 rounds
       [6] aggregateScore                       scoring/aggregate.ts   CODE, not model
       └─ createReport(report_data: { metrics, sources, trace, businessName, … })

Meanwhile the browser:
report/[id]/page.tsx → ReportPending → useSubmissionStatus (SWR, 4s)
  └─ GET /api/submissions/[id]/status → "scored" → router.refresh() → full report
```

Every step is timed and recorded by `lib/ai/trace.ts` into
`report_data.trace` — that trace is the "How this score was produced" panel
and the PDF's Appendix A.

### 4.2 Report read (screen)

```
report/[id]/page.tsx (server)
  ├─ getSubmissionById + ownership check → notFound() on mismatch
  ├─ getReportBySubmissionId → none? → <ReportPending/> (polls)
  └─ renders ReportHero / MetricsGrid / ReportSections / ScoringTrace
     entirely from the stored row — no model calls on the read path
```

### 4.3 PDF export

```
GET /api/reports/[id]/pdf  (maxDuration 60)
  ├─ Clerk auth → ownership check (404 on any mismatch)
  ├─ reportTitle(rawText, report_data.businessName)     utils/format.ts
  └─ renderReportPdf(input)                             lib/pdf/ReportDocument.tsx
       cover → contents (+ PDF bookmarks) → executive summary (evidence
       coverage, score scale) → metric analysis (assessment, validated
       evidence, rubric anchors) → findings → "what would move the score"
       (next anchor up, verbatim from the rubric) → memo → appendices
       A methodology / B sources / C provenance / D glossary / E primers
       → one-line disclaimer, always last
```

Two react-pdf traps are documented in that file: no `lineHeight` on `Page`
(it silently erases dynamic page numbers) and unitless `lineHeight`
resolving against the element's *own* `fontSize`.

### 4.4 Source preferences

```
settings/actions.ts (server actions, Zod + normalizeDomain)
  └─ queries/sourcePreferences.ts   upsert on (userId, domain); a domain is
                                    favorite XOR blocked — saving the other
                                    kind updates in place
pipeline.ts loads them per run and passes { blockedDomains, favoriteDomains,
cacheScope } into the enricher. Users with preferences get an isolated cache
scope; everyone else shares "global".
```

## 5. Data model (Drizzle, `src/lib/db/schema.ts`)

| Table | Purpose | Notable columns |
|---|---|---|
| `users` | Clerk mirror, lazily upserted | id = Clerk user id; email unique |
| `submissions` | one per validation request | raw_text, input_type, stage, target_region, content_hash (sha-256), embedding_id |
| `reports` | one per scored submission | overall_score + 8 metric columns, grade, investment_tier, **report_data jsonb** (metrics with audit fields, sources, trace, businessName), weights_snapshot, prompt_version, scorer_model, from_cache, region_context |
| `admin_configs` | per-user rubric config | weights (must sum to 100), thresholds, active_preset, model_tier |
| `source_preferences` | per-user research domains | kind favorite\|blocked, domain (normalized hostname), sector (seeded, unused) |
| `embeddings` | drift-gate vectors | per submission, compared per user |

Ownership is enforced in query/route code, not RLS — auth is Clerk, so the
app's Postgres role owns the tables and RLS exists only to close Supabase's
PostgREST surface.

## 6. The verification discipline (how changes ship)

Structural work here follows a written plan (`docs/PLAN-*.md`) with a gate
per phase and a verification record filled in before anything is called
done. The gates, in the order they are run:

```
npx tsc --noEmit                     types
npm run lint                         eslint
npm test                             unit + render tests (pdftotext content
                                     assertions on generated PDFs)
npm run build                        production build (no env sourcing!)
RUN_LIVE=1 …scoring-consistency…     ±5 band, real Sonnet — release gate for
                                     any change near the scorer
prompt change? → A/B old vs new      5 runs each; mean shift ≤ 5 or revise
                                     the prompt, never the test
live e2e                             a real submission through the pipeline,
                                     inspected in DB and rendered PDF
```

Commits are phase-sized with plain messages; pushes deploy (Vercel hook), so
a push is a release decision, not a save.

## 7. Extending safely — worked examples

**A new pipeline step**: add it to `pipeline.ts` between the numbered
steps, wrap it in `trace.record(n, name, describe, fn)`, make its failure
degrade (return null / skip) rather than throw, and give any cached state a
versioned key. It must not touch the aggregate.

**A new per-metric field from the scorer**: add it optional to
`MetricScore` (`types/report.ts`), required to the structured-output schema
in `scorer.ts`, describe it in the prompt (→ version bump + golden hash +
A/B), render it with a fallback for older reports in `MetricsGrid.tsx` and
`ReportDocument.tsx`. If the model can invent it, validate it in code the
way `evidence.ts` does.

**A new report surface**: read only from `report_data`; guard every v1.2
field (`assessment ?? note`), and give legacy reports an explicit "predates
X" state instead of blanks.

**A new external service**: wrap it in one file under `lib/`, degrade to a
no-op on failure, add its keys to `env.ts`, and remember production env
vars live in Vercel (values must be pushed unquoted; `vercel env pull`
returns empty strings by design).

## 8. Known gaps (deliberate, not forgotten)

- Admin weights UI does not persist yet (`admin_configs` write path
  exists; `RubricEditor` still holds local state).
- Team / Traction / founder financials can never be externally evidenced —
  the honest ceiling of web enrichment; founder-supplied documents are the
  designed next step.
- Clerk runs on development-instance keys in production; swap before real
  traffic.
- Supabase free tier auto-pauses after ~a week idle; a keep-alive ping (or
  paid tier) is required for demo reliability.
