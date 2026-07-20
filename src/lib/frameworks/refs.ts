export type FrameworkKey = "NIST_AI_RMF" | "EU_AI_ACT" | "ISO_42001";

export type FrameworkRef = {
  framework: FrameworkKey;
  referenceId: string;
  label: string;
};

export const FRAMEWORK_REFS: FrameworkRef[] = [
  { framework: "NIST_AI_RMF", referenceId: "GOVERN.1.1", label: "GOVERN 1.1 — Legal & regulatory requirements" },
  { framework: "NIST_AI_RMF", referenceId: "GOVERN.1.2", label: "GOVERN 1.2 — Trustworthy AI characteristics" },
  { framework: "NIST_AI_RMF", referenceId: "MAP.1.1", label: "MAP 1.1 — Intended purpose & context" },
  { framework: "NIST_AI_RMF", referenceId: "MAP.2.1", label: "MAP 2.1 — Categorize AI risks" },
  { framework: "NIST_AI_RMF", referenceId: "MEASURE.1.1", label: "MEASURE 1.1 — Appropriate metrics" },
  { framework: "NIST_AI_RMF", referenceId: "MEASURE.2.1", label: "MEASURE 2.1 — Evaluations performed" },
  { framework: "NIST_AI_RMF", referenceId: "MANAGE.1.1", label: "MANAGE 1.1 — Risk response prioritization" },
  { framework: "NIST_AI_RMF", referenceId: "MANAGE.4.1", label: "MANAGE 4.1 — Post-deployment monitoring" },
  { framework: "EU_AI_ACT", referenceId: "Art.5", label: "Article 5 — Prohibited AI practices" },
  { framework: "EU_AI_ACT", referenceId: "Art.6", label: "Article 6 — Classification rules for high-risk AI" },
  { framework: "EU_AI_ACT", referenceId: "Art.9", label: "Article 9 — Risk management system" },
  { framework: "EU_AI_ACT", referenceId: "Art.10", label: "Article 10 — Data and data governance" },
  { framework: "EU_AI_ACT", referenceId: "Art.13", label: "Article 13 — Transparency and provision of information" },
  { framework: "EU_AI_ACT", referenceId: "Art.14", label: "Article 14 — Human oversight" },
  { framework: "EU_AI_ACT", referenceId: "Art.26", label: "Article 26 — Obligations of deployers of high-risk AI" },
  { framework: "EU_AI_ACT", referenceId: "Art.50", label: "Article 50 — Transparency obligations for providers & deployers" },
  { framework: "ISO_42001", referenceId: "5.2", label: "5.2 — AI policy" },
  { framework: "ISO_42001", referenceId: "6.1", label: "6.1 — Actions to address risks and opportunities" },
  { framework: "ISO_42001", referenceId: "8.2", label: "8.2 — AI risk assessment" },
  { framework: "ISO_42001", referenceId: "8.4", label: "8.4 — AI system impact assessment" },
  { framework: "ISO_42001", referenceId: "9.1", label: "9.1 — Monitoring, measurement, analysis and evaluation" },
  { framework: "ISO_42001", referenceId: "A.5.2", label: "A.5.2 — AI policy" },
  { framework: "ISO_42001", referenceId: "A.6.1.2", label: "A.6.1.2 — AI system impact assessment process" },
  { framework: "ISO_42001", referenceId: "A.6.2.3", label: "A.6.2.3 — AI system documentation" },
  { framework: "ISO_42001", referenceId: "A.8.2", label: "A.8.2 — AI risk treatment" },
  { framework: "ISO_42001", referenceId: "A.8.4", label: "A.8.4 — AI system life cycle" },
];

export function refsByFramework(framework: FrameworkKey): FrameworkRef[] {
  return FRAMEWORK_REFS.filter((r) => r.framework === framework);
}

export function findRef(framework: FrameworkKey, referenceId: string): FrameworkRef | undefined {
  return FRAMEWORK_REFS.find(
    (r) => r.framework === framework && r.referenceId === referenceId,
  );
}
