import { eq } from "drizzle-orm";
import { PageHeader, StatusBadge } from "@/components/ui";
import { ensureDb } from "@/lib/db/ensure";
import { getDb } from "@/lib/db";
import {
  hardGates,
  riskFactors,
  riskMethodologyVersions,
  tierObligations,
} from "@/lib/db/schema";
import { parseJsonArray } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function MethodologyPage() {
  ensureDb();
  const db = getDb();
  const versions = db.select().from(riskMethodologyVersions).all();
  const active = versions.find((v) => v.isActive) ?? versions[0];
  const factors = active
    ? db
        .select()
        .from(riskFactors)
        .where(eq(riskFactors.methodologyVersionId, active.id))
        .all()
        .sort((a, b) => a.sortOrder - b.sortOrder)
    : [];
  const gates = active
    ? db
        .select()
        .from(hardGates)
        .where(eq(hardGates.methodologyVersionId, active.id))
        .all()
    : [];
  const obligations = active
    ? db
        .select()
        .from(tierObligations)
        .where(eq(tierObligations.methodologyVersionId, active.id))
        .all()
    : [];

  return (
    <div className="stack">
      <PageHeader
        title="Risk methodology"
        description="Versioned slider weights, hard gates, and tier-to-obligation mapping. Completed evaluations permanently record the version used."
      />
      <div className="panel panel-pad fade-in">
        <h2 style={{ margin: "0 0 0.5rem", fontFamily: "var(--font-display)" }}>
          Versions
        </h2>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Version</th>
              <th>Effective</th>
              <th>Active</th>
            </tr>
          </thead>
          <tbody>
            {versions.map((v) => (
              <tr key={v.id}>
                <td>{v.name}</td>
                <td>v{v.version}</td>
                <td>{v.effectiveFrom}</td>
                <td>
                  {v.isActive ? <StatusBadge value="approved" /> : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {active ? (
        <>
          <div className="panel fade-in">
            <div className="panel-pad">
              <h2 style={{ margin: 0, fontFamily: "var(--font-display)" }}>
                Risk factors ({active.name})
              </h2>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Factor</th>
                  <th>Weight</th>
                  <th>Guidance</th>
                </tr>
              </thead>
              <tbody>
                {factors.map((f) => (
                  <tr key={f.id}>
                    <td>{f.label}</td>
                    <td>{f.weight}</td>
                    <td>{f.guidance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="panel fade-in">
            <div className="panel-pad">
              <h2 style={{ margin: 0, fontFamily: "var(--font-display)" }}>
                Hard gates
              </h2>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Gate</th>
                  <th>Effect</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {gates.map((g) => (
                  <tr key={g.id}>
                    <td>{g.label}</td>
                    <td>
                      {g.effect}
                      {g.forcedTier ? ` → ${g.forcedTier}` : ""}
                      {g.blocksApproval ? " · blocks approval" : ""}
                    </td>
                    <td>{g.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="panel fade-in">
            <div className="panel-pad">
              <h2 style={{ margin: 0, fontFamily: "var(--font-display)" }}>
                Tier → obligation mapping
              </h2>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Tier</th>
                  <th>Artifacts</th>
                  <th>Approvals</th>
                  <th>Review cadence</th>
                </tr>
              </thead>
              <tbody>
                {obligations.map((o) => (
                  <tr key={o.id}>
                    <td>{o.tier}</td>
                    <td>{parseJsonArray(o.requiredArtifacts).join(", ")}</td>
                    <td>{parseJsonArray(o.requiredApprovals).join(", ")}</td>
                    <td>{o.reviewCadenceDays} days</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
