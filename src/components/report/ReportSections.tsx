import type { ReportData } from "@/types/report";
import { sectionDotColor, type SectionTone } from "@/lib/utils/format";

interface Section {
  key: string;
  label: string;
  tone: SectionTone;
  items: string[];
}

function SectionCard({ section }: { section: Section }) {
  const dot = sectionDotColor(section.tone);
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-subtle-foreground">
        {section.label}
      </h3>
      <ul className="mt-4 flex flex-col gap-3">
        {section.items.map((item, i) => (
          <li key={i} className="flex items-start gap-3">
            <span
              className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: dot }}
              aria-hidden="true"
            />
            <span className="text-sm leading-relaxed text-foreground text-pretty">
              {item}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ReportSections({ data }: { data: ReportData }) {
  const sections: Section[] = [
    { key: "strengths", label: "Strengths", tone: "success", items: data.strengths },
    { key: "weaknesses", label: "Weaknesses", tone: "danger", items: data.weaknesses },
    { key: "recommendations", label: "Recommendations", tone: "info", items: data.recommendations },
    { key: "quickWins", label: "Quick Wins", tone: "accent", items: data.quickWins },
    { key: "risks", label: "Risks", tone: "warning", items: data.risks },
  ];

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {sections.map((s) => (
        <SectionCard key={s.key} section={s} />
      ))}
    </section>
  );
}
