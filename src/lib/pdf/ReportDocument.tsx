import path from "node:path";
import {
  Document,
  Font,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type {
  EnrichmentSource,
  Grade,
  MetricId,
  PipelineStep,
  ReportData,
} from "@/types/report";
import { identifyPreset } from "@/lib/scoring/presets";
import {
  EVIDENCE_LABELS,
  METRIC_LABELS,
  METRIC_ORDER,
} from "@/lib/utils/format";

// The downloadable report. Generated as a document — cover, executive
// summary, per-metric analysis, findings, memo, appendices — rather than
// printed from the screen layout, so a firm can file it or pass it round a
// table. Paper-first: white ground, ink text, the brand accent used only as
// a fill behind the score and on section rules.
//
// Styling here is @react-pdf's StyleSheet, not Tailwind: a PDF has no DOM
// for utility classes to attach to. This is the one sanctioned exception to
// CLAUDE.md rule 8 and is confined to src/lib/pdf/.

// Brand faces, embedded so the document renders identically in every
// viewer (the base-14 fonts are not embedded and depend on the reader's
// substitutes). Files ship with the route via outputFileTracingIncludes.
const FONT_DIR = path.join(process.cwd(), "src/lib/pdf/fonts");
Font.register({
  family: "DM Serif Display",
  src: path.join(FONT_DIR, "DMSerifDisplay-Regular.ttf"),
});
Font.register({
  family: "Syne",
  fonts: [
    { src: path.join(FONT_DIR, "Syne-Regular.ttf"), fontWeight: 400 },
    { src: path.join(FONT_DIR, "Syne-SemiBold.ttf"), fontWeight: 600 },
    { src: path.join(FONT_DIR, "Syne-Bold.ttf"), fontWeight: 700 },
  ],
});
Font.register({
  family: "DM Mono",
  fonts: [
    { src: path.join(FONT_DIR, "DMMono-Regular.ttf"), fontWeight: 400 },
    { src: path.join(FONT_DIR, "DMMono-Medium.ttf"), fontWeight: 500 },
  ],
});
// Identifiers and URLs must never be hyphen-broken across lines.
Font.registerHyphenationCallback((word) => [word]);

export interface ReportPdfInput {
  id: string;
  business: string;
  subtitle?: string; // the rest of the submission's first line, if any
  type: string;
  region: string;
  date: string; // ISO
  overallScore: number;
  grade: Grade;
  investmentTier: string;
  weights: Record<MetricId, number>;
  data: ReportData;
  promptVersion: string;
  scorerModel: string;
  fromCache: boolean;
  preparedFor: string;
}

const SERIF = "DM Serif Display";
const SANS = "Syne";
const MONO = "DM Mono";

const INK = "#141414";
const MUTED = "#5f5f5f";
const SUBTLE = "#8a8a8a";
const RULE = "#d9d9d9";
const ACCENT_FILL = "#e8ff47"; // brand lime — fill only, never text on white
const ACCENT_INK = "#3b4d00"; // lime pushed to ink weight; readable on both

// Grade colours re-tuned for paper: the on-screen palette is built for a
// dark ground and washes out in print.
const GRADE_INK: Record<Grade, string> = {
  "A+": "#1f7a3f",
  A: "#1f7a3f",
  "B+": "#3d7a1f",
  B: "#3d7a1f",
  "C+": "#a86f0c",
  C: "#a86f0c",
  D: "#b94a1a",
  F: "#a8261e",
};

const BASIS_INK = {
  "regional-data": "#1f7a3f",
  submission: "#a86f0c",
  "rubric-inference": "#a8261e",
} as const;

const s = StyleSheet.create({
  // No lineHeight at page level: react-pdf drops dynamic (render-prop) text
  // that inherits one, which silently erases the page numbers. Prose styles
  // carry their own line height instead.
  page: {
    fontFamily: SANS,
    fontSize: 9.5,
    color: INK,
    paddingTop: 64,
    paddingBottom: 60,
    paddingHorizontal: 54,
  },
  running: {
    position: "absolute",
    fontFamily: MONO,
    fontSize: 7,
    color: SUBTLE,
    letterSpacing: 0.6,
  },
  // Right-aligned running text needs an explicit box (both edges set):
  // dynamic page-number text has no intrinsic width at layout time and
  // collapses to nothing otherwise.
  runningHeaderLeft: { top: 28, left: 54, right: 300 },
  runningHeaderRight: { top: 28, left: 300, right: 54, textAlign: "right" },
  runningFooterLeft: { bottom: 28, left: 54, right: 300 },
  runningFooterRight: { bottom: 28, left: 300, right: 54, textAlign: "right" },

  // Cover
  coverPage: {
    fontFamily: SANS,
    color: INK,
    paddingTop: 120,
    paddingBottom: 60,
    paddingHorizontal: 54,
  },
  coverEyebrow: {
    fontFamily: MONO,
    fontSize: 8,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: SUBTLE,
    marginBottom: 14,
  },
  coverTitle: {
    fontFamily: SERIF,
    fontSize: 28,
    lineHeight: 1.15,
    marginBottom: 8,
  },
  coverMeta: { fontSize: 10, color: MUTED, marginBottom: 40 },
  scoreBlock: {
    backgroundColor: ACCENT_FILL,
    padding: 22,
    marginBottom: 26,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  scoreNumber: {
    fontFamily: SERIF,
    fontSize: 62,
    lineHeight: 1,
    color: INK,
  },
  scoreDenominator: {
    fontFamily: MONO,
    fontSize: 9,
    color: ACCENT_INK,
    marginTop: 6,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  scoreRight: { alignItems: "flex-end" },
  scoreGrade: { fontFamily: SERIF, fontSize: 34, lineHeight: 1 },
  scoreTier: {
    fontFamily: MONO,
    fontSize: 8,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: ACCENT_INK,
    marginTop: 6,
  },
  coverFoot: {
    position: "absolute",
    bottom: 60,
    left: 54,
    right: 54,
    borderTopWidth: 1,
    borderTopColor: RULE,
    paddingTop: 10,
    fontSize: 8,
    color: MUTED,
    lineHeight: 1.6,
  },
  coverFootId: { fontFamily: MONO },

  // Sections
  h1: { fontFamily: SERIF, fontSize: 17, color: INK, marginBottom: 6 },
  h1Rule: {
    height: 3,
    backgroundColor: ACCENT_FILL,
    width: 44,
    marginTop: 2,
    marginBottom: 14,
  },
  h2: {
    fontFamily: SANS,
    fontWeight: 700,
    fontSize: 10,
    color: ACCENT_INK,
    marginTop: 14,
    marginBottom: 5,
    letterSpacing: 0.3,
  },
  // A unitless lineHeight multiplies the element's OWN fontSize; inheriting
  // the size resolves against the default instead, so each declares both.
  body: { fontSize: 9.5, lineHeight: 1.5 },
  p: { fontSize: 9.5, lineHeight: 1.5, marginBottom: 7, color: INK },
  pMuted: { fontSize: 9.5, lineHeight: 1.5, marginBottom: 7, color: MUTED },
  small: { fontSize: 8, color: MUTED },

  // Scorecard table
  table: { marginTop: 6, marginBottom: 10 },
  tr: {
    flexDirection: "row",
    borderBottomWidth: 0.6,
    borderBottomColor: RULE,
    paddingVertical: 5,
    alignItems: "center",
  },
  trHead: {
    flexDirection: "row",
    borderBottomWidth: 1.2,
    borderBottomColor: INK,
    paddingBottom: 4,
  },
  th: {
    fontFamily: MONO,
    fontSize: 7,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: SUBTLE,
  },
  tdMetric: { width: "30%" },
  tdScore: { width: "12%", fontFamily: MONO, fontWeight: 500 },
  tdWeight: { width: "12%", fontFamily: MONO, color: MUTED },
  tdBand: { width: "16%", fontFamily: MONO, color: MUTED },
  tdBasis: { width: "30%", flexDirection: "row", alignItems: "center" },

  // Metric analysis
  metric: {
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 0.6,
    borderBottomColor: RULE,
  },
  metricHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 4,
  },
  metricName: { fontFamily: SERIF, fontSize: 13 },
  metricScore: { fontFamily: SERIF, fontSize: 20, lineHeight: 1 },
  metricMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    fontSize: 7.5,
    color: MUTED,
    marginBottom: 6,
  },
  metricLabel: {
    fontFamily: MONO,
    fontSize: 7,
    color: SUBTLE,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginTop: 4,
  },
  badge: {
    fontFamily: MONO,
    fontWeight: 500,
    fontSize: 6.5,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderWidth: 0.8,
    marginRight: 6,
  },

  // Lists
  li: { flexDirection: "row", marginBottom: 4 },
  liNum: { width: 20, fontFamily: MONO, color: SUBTLE },
  liText: { flex: 1, fontSize: 9.5, lineHeight: 1.5 },

  memo: {
    borderLeftWidth: 3,
    borderLeftColor: ACCENT_FILL,
    paddingLeft: 12,
    marginTop: 4,
    color: INK,
    fontSize: 9.5,
    lineHeight: 1.6,
  },

  // Appendix
  step: {
    flexDirection: "row",
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 0.6,
    borderBottomColor: RULE,
  },
  stepNum: { width: 22, fontFamily: MONO, color: SUBTLE },
  stepBody: { flex: 1 },
  stepName: { fontWeight: 700, marginBottom: 2 },
  stepMeta: { fontFamily: MONO, fontSize: 7, color: SUBTLE, marginTop: 3 },
  source: { marginBottom: 7 },
  sourceRef: { fontFamily: MONO, fontWeight: 500 },
  sourceUrl: {
    fontFamily: MONO,
    fontSize: 7.5,
    color: ACCENT_INK,
    textDecoration: "none",
  },
  kv: {
    flexDirection: "row",
    borderBottomWidth: 0.6,
    borderBottomColor: RULE,
    paddingVertical: 4,
  },
  k: { width: "34%", color: MUTED },
  v: { flex: 1, fontFamily: MONO, fontSize: 8.5 },
});

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

// Running header/footer. Each piece is a direct, `fixed` child of the page,
// which is the documented shape for the page-number render callback.
function Chrome({ business, id }: { business: string; id: string }) {
  return (
    <>
      <Text style={[s.running, s.runningHeaderLeft]} fixed>
        BIZVALIDATE · VALIDATION REPORT
      </Text>
      <Text style={[s.running, s.runningHeaderRight]} fixed>
        {business.toUpperCase()}
      </Text>
      <Text style={[s.running, s.runningFooterLeft]} fixed>
        REPORT {shortId(id)} · CONFIDENTIAL
      </Text>
      <Text
        style={[s.running, s.runningFooterRight]}
        fixed
        render={({ pageNumber, totalPages }) =>
          `PAGE ${pageNumber} OF ${totalPages}`
        }
      />
    </>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <View>
      <Text style={s.h1}>{children}</Text>
      <View style={s.h1Rule} />
    </View>
  );
}

function NumberedList({ items }: { items: string[] }) {
  return (
    <View>
      {items.map((item, i) => (
        <View key={i} style={s.li} wrap={false}>
          <Text style={s.liNum}>{String(i + 1).padStart(2, "0")}</Text>
          <Text style={s.liText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function EvidenceBadge({ basis }: { basis?: keyof typeof BASIS_INK }) {
  if (!basis) return null;
  const color = BASIS_INK[basis];
  return (
    <Text style={[s.badge, { color, borderColor: color }]}>
      {EVIDENCE_LABELS[basis].label}
    </Text>
  );
}

function Cover({ input }: { input: ReportPdfInput }) {
  return (
    <Page size="A4" style={s.coverPage}>
      <Text style={s.coverEyebrow}>Validation Report</Text>
      <Text style={s.coverTitle}>{input.business}</Text>
      {input.subtitle ? (
        <Text style={{ fontSize: 12, color: MUTED, marginBottom: 6 }}>
          {input.subtitle}
        </Text>
      ) : null}
      <Text style={s.coverMeta}>
        {input.type} · {input.region} · {formatDate(input.date)}
      </Text>

      <View style={s.scoreBlock}>
        <View>
          <Text style={s.scoreNumber}>{input.overallScore.toFixed(1)}</Text>
          <Text style={s.scoreDenominator}>out of 100</Text>
        </View>
        <View style={s.scoreRight}>
          <Text style={[s.scoreGrade, { color: GRADE_INK[input.grade] }]}>
            {input.grade}
          </Text>
          <Text style={s.scoreTier}>{input.investmentTier}</Text>
        </View>
      </View>

      <Text style={s.pMuted}>{input.data.verdict}</Text>

      <View style={s.coverFoot}>
        <Text>Prepared for {input.preparedFor}</Text>
        <Text style={s.coverFootId}>Report ID {input.id}</Text>
        <Text>
          Confidential. Scores measure how well-evidenced a business case is
          against a published investment rubric; they do not predict outcomes
          and are not investment advice.
        </Text>
      </View>
    </Page>
  );
}

function ExecutiveSummary({ input }: { input: ReportPdfInput }) {
  const { data, weights } = input;
  return (
    <Page size="A4" style={s.page}>
      <Chrome business={input.business} id={input.id} />
      <SectionTitle>Executive Summary</SectionTitle>
      <Text style={s.p}>{data.verdict}</Text>
      <Text style={s.h2}>Stage alignment</Text>
      <Text style={s.p}>{data.stageAlignment}</Text>

      <Text style={s.h2}>Scorecard</Text>
      <View style={s.table}>
        <View style={s.trHead}>
          <Text style={[s.th, s.tdMetric]}>Metric</Text>
          <Text style={[s.th, s.tdScore]}>Score</Text>
          <Text style={[s.th, s.tdWeight]}>Weight</Text>
          <Text style={[s.th, s.tdBand]}>Band</Text>
          <Text style={[s.th, { width: "30%" }]}>Evidence</Text>
        </View>
        {METRIC_ORDER.map((id) => {
          const m = data.metrics[id];
          return (
            <View key={id} style={s.tr}>
              <Text style={s.tdMetric}>{METRIC_LABELS[id]}</Text>
              <Text style={s.tdScore}>{m.score}</Text>
              <Text style={s.tdWeight}>{weights[id]}%</Text>
              <Text style={s.tdBand}>{m.anchorBand ?? "—"}</Text>
              <View style={s.tdBasis}>
                <EvidenceBadge basis={m.basis} />
                {m.sourceRefs && m.sourceRefs.length > 0 ? (
                  <Text style={[s.small, { fontFamily: MONO }]}>
                    {m.sourceRefs.map((r) => `[S${r}]`).join(" ")}
                  </Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
      <Text style={s.small}>
        Overall score is a weighted sum computed in code from the metric
        scores above. Evidence: Evidenced = supported by cited external
        sources; Stated = taken from the submission, not independently
        verified; Inferred = calibrated against the rubric alone.
      </Text>
    </Page>
  );
}

function MetricAnalysis({ input }: { input: ReportPdfInput }) {
  const { data, weights } = input;
  return (
    <Page size="A4" style={s.page}>
      <Chrome business={input.business} id={input.id} />
      <SectionTitle>Metric Analysis</SectionTitle>
      {METRIC_ORDER.map((id) => {
        const m = data.metrics[id];
        return (
          <View key={id} style={s.metric} wrap={false}>
            <View style={s.metricHead}>
              <Text style={s.metricName}>{METRIC_LABELS[id]}</Text>
              <Text style={s.metricScore}>{m.score}</Text>
            </View>
            <View style={s.metricMetaRow}>
              <EvidenceBadge basis={m.basis} />
              <Text>
                Weight {weights[id]}%
                {m.anchorBand ? ` · Band ${m.anchorBand}` : ""}
                {m.confidence
                  ? ` · ${m.confidence} confidence in this reading`
                  : ""}
                {m.rescored ? " · re-scored after outlier check" : ""}
                {m.sourceRefs && m.sourceRefs.length > 0
                  ? ` · Sources ${m.sourceRefs.map((r) => `[S${r}]`).join(" ")}`
                  : ""}
              </Text>
            </View>
            <Text style={s.p}>{m.note}</Text>
            <Text style={s.metricLabel}>Strength</Text>
            <Text style={s.p}>{m.strength}</Text>
            <Text style={s.metricLabel}>Gap</Text>
            <Text style={s.p}>{m.gap}</Text>
          </View>
        );
      })}
    </Page>
  );
}

function Findings({ input }: { input: ReportPdfInput }) {
  const { data } = input;
  return (
    <Page size="A4" style={s.page}>
      <Chrome business={input.business} id={input.id} />
      <SectionTitle>Findings</SectionTitle>
      <Text style={s.h2}>Strengths</Text>
      <NumberedList items={data.strengths} />
      <Text style={s.h2}>Weaknesses</Text>
      <NumberedList items={data.weaknesses} />
      <Text style={s.h2}>Risks</Text>
      <NumberedList items={data.risks} />
      <Text style={s.h2}>Recommendations</Text>
      <NumberedList items={data.recommendations} />
      <Text style={s.h2}>Quick wins</Text>
      <NumberedList items={data.quickWins} />

      {/* Kept together so the heading can never strand at a page foot. */}
      <View wrap={false} style={{ marginTop: 10 }}>
        <SectionTitle>Investor Memo</SectionTitle>
        <Text style={s.memo}>{data.investorNotes}</Text>
        <Text style={[s.small, { marginTop: 6 }]}>Model-generated memo.</Text>
      </View>
    </Page>
  );
}

function stepStatus(step: PipelineStep): string {
  return { ran: "Ran", skipped: "Skipped", cached: "Cached", failed: "Failed" }[
    step.status
  ];
}

function Appendix({ input }: { input: ReportPdfInput }) {
  const { data, weights } = input;
  const trace = data.trace ?? [];
  const sources: EnrichmentSource[] = data.sources ?? [];
  const preset = identifyPreset(weights);

  return (
    <Page size="A4" style={s.page}>
      <Chrome business={input.business} id={input.id} />
      <SectionTitle>Appendix A · Methodology</SectionTitle>
      <Text style={s.pMuted}>
        How this score was produced. Every step of the fixed six-step pipeline
        is recorded with what it did and which model ran it. The final number
        is arithmetic, not a model&apos;s judgment.
      </Text>
      {trace.length === 0 ? (
        <Text style={s.p}>
          This report was scored before step-by-step tracing was introduced,
          so its pipeline record was not captured. Its score is unchanged and
          remains attributable to the prompt version listed in Appendix C.
        </Text>
      ) : (
        trace.map((step) => (
          <View key={step.step} style={s.step} wrap={false}>
            <Text style={s.stepNum}>{String(step.step).padStart(2, "0")}</Text>
            <View style={s.stepBody}>
              <Text style={s.stepName}>{step.name}</Text>
              <Text style={s.body}>{step.detail}</Text>
              <Text style={s.stepMeta}>
                {stepStatus(step)}
                {step.model ? ` · ${step.model}` : ""} ·{" "}
                {(step.durationMs / 1000).toFixed(1)}s
              </Text>
            </View>
          </View>
        ))
      )}

      <Text style={s.h2}>Weighting</Text>
      <Text style={s.p}>
        {preset ? `${preset.name} — ${preset.source}.` : "Custom weights."}{" "}
        {METRIC_ORDER.map((id) => `${METRIC_LABELS[id]} ${weights[id]}%`).join(
          " · ",
        )}
        .
      </Text>

      <SectionTitle>Appendix B · Sources</SectionTitle>
      {sources.length === 0 ? (
        <Text style={s.p}>
          No external sources were retrieved for this report. Scores rest on
          the submission itself, which is why evidence-dependent metrics are
          marked Stated rather than Evidenced.
        </Text>
      ) : (
        sources.map((src) => (
          <View key={src.id} style={s.source} wrap={false}>
            <Text style={s.body}>
              <Text style={s.sourceRef}>[S{src.id}] </Text>
              {src.title}
            </Text>
            <Link src={src.url} style={s.sourceUrl}>
              {src.url}
            </Link>
          </View>
        ))
      )}

      <SectionTitle>Appendix C · Provenance</SectionTitle>
      <View>
        {[
          ["Report ID", input.id],
          ["Generated", formatDate(input.date)],
          ["Prompt version", input.promptVersion],
          ["Scoring model", `${input.scorerModel} · temperature 0.1`],
          ["Final score", "Weighted sum computed in code, not by a model"],
          [
            "Result",
            input.fromCache
              ? "Reused from a near-identical earlier submission"
              : "Scored fresh for this submission",
          ],
        ].map(([k, v]) => (
          <View key={k} style={s.kv}>
            <Text style={s.k}>{k}</Text>
            <Text style={s.v}>{v}</Text>
          </View>
        ))}
      </View>
    </Page>
  );
}

export function ReportDocument({ input }: { input: ReportPdfInput }) {
  return (
    <Document
      title={`BizValidate — ${input.business}`}
      author="BizValidate"
      subject="Validation report"
    >
      <Cover input={input} />
      <ExecutiveSummary input={input} />
      <MetricAnalysis input={input} />
      <Findings input={input} />
      <Appendix input={input} />
    </Document>
  );
}

export function renderReportPdf(input: ReportPdfInput): Promise<Buffer> {
  return renderToBuffer(<ReportDocument input={input} />);
}
