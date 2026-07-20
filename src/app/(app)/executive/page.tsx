import Link from "next/link";
import { ExportLinks, PageHeader } from "@/components/ui";
import { ensureDb } from "@/lib/db/ensure";
import { getDb } from "@/lib/db";
import { aiSystems, intakeSubmissions } from "@/lib/db/schema";
import { computeMetrics } from "@/lib/metrics";
import { labelize } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function ExecutivePage() {
  ensureDb();
  const metrics = computeMetrics();
  const db = getDb();
  const systems = db.select().from(aiSystems).all();
  const intakes = db.select().from(intakeSubmissions).all();
  const tierCounts = ["low", "medium", "high", "critical"].map((tier) => ({
    tier,
    count: systems.filter((s) => s.riskTier === tier).length,
  }));

  return (
    <div className="stack">
      <PageHeader
        title="Executive Dashboard"
        description="Decision-forcing metrics from live governance data. Click any widget to inspect underlying records."
        actions={
          <>
            <ExportLinks basePath="/api/export/executive" />
            <a className="btn btn-secondary" href="/api/export/executive?format=json">
              Board snapshot JSON
            </a>
          </>
        }
      />
      <div className="metrics fade-in">
        {metrics.map((m) => (
          <Link key={m.id} href={m.href} className="metric" style={{ display: "block" }}>
            <div className="muted">{m.name}</div>
            <div className="value">{m.value}</div>
            <div className="muted" style={{ fontSize: "0.82rem" }}>
              {m.description}
            </div>
          </Link>
        ))}
      </div>
      <div className="panel panel-pad fade-in stack">
        <h2 style={{ margin: 0, fontFamily: "var(--font-display)" }}>
          Inventory risk-tier distribution
        </h2>
        <div className="metrics">
          {tierCounts.map((t) => (
            <div className="metric" key={t.tier}>
              <div className="muted">{labelize(t.tier)}</div>
              <div className="value">{t.count}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="panel panel-pad fade-in">
        <h2 style={{ margin: "0 0 0.75rem", fontFamily: "var(--font-display)" }}>
          Intake throughput snapshot
        </h2>
        <div className="muted">
          {intakes.length} total submissions ·{" "}
          {intakes.filter((i) => i.status === "approved").length} approved ·{" "}
          {intakes.filter((i) => i.status === "evaluated").length} evaluated ·{" "}
          {intakes.filter((i) => i.status === "submitted" || i.status === "in_review").length}{" "}
          in queue
        </div>
      </div>
    </div>
  );
}
