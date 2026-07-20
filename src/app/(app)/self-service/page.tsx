import Link from "next/link";
import { eq } from "drizzle-orm";
import { completeAttestationAction } from "@/app/actions/policies";
import { PageHeader, StatusBadge } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/session";
import { ensureDb } from "@/lib/db/ensure";
import { getDb } from "@/lib/db";
import {
  aiSystems,
  attestations,
  intakeSubmissions,
  policies,
  policyVersions,
} from "@/lib/db/schema";
import { parseJsonArray, parseJsonObject } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SelfServicePage() {
  ensureDb();
  const user = await getCurrentUser();
  if (!user) return null;
  const db = getDb();
  const myIntakes = db
    .select()
    .from(intakeSubmissions)
    .where(eq(intakeSubmissions.submitterId, user.id))
    .all();
  const mySystems = db
    .select()
    .from(aiSystems)
    .all()
    .filter(
      (s) => s.businessOwnerId === user.id || s.technicalOwnerId === user.id,
    );
  const myAtts = db
    .select()
    .from(attestations)
    .where(eq(attestations.userId, user.id))
    .all();
  const versions = Object.fromEntries(
    db.select().from(policyVersions).all().map((v) => [v.id, v]),
  );
  const pols = Object.fromEntries(
    db.select().from(policies).all().map((p) => [p.id, p]),
  );

  return (
    <div className="stack">
      <PageHeader
        title="Stakeholder Self-Service"
        description="Submit use cases, check status, see obligations, and complete attestations — without emailing the governance manager."
        actions={
          <Link className="btn btn-primary" href="/intake/new">
            Submit use case
          </Link>
        }
      />

      <div className="panel fade-in">
        <div className="panel-pad">
          <h2 style={{ margin: 0, fontFamily: "var(--font-display)" }}>
            My submissions
          </h2>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Tier / obligations</th>
            </tr>
          </thead>
          <tbody>
            {myIntakes.map((i) => {
              const obl = parseJsonObject<{
                requiredArtifacts?: string[];
                reviewCadenceDays?: number;
              }>(i.obligationSnapshot);
              return (
                <tr key={i.id}>
                  <td>
                    <Link href={`/intake/${i.id}`}>{i.title}</Link>
                  </td>
                  <td>
                    <StatusBadge value={i.status} />
                  </td>
                  <td>
                    {i.resultingTier ?? "—"}
                    {obl?.requiredArtifacts ? (
                      <div className="muted" style={{ fontSize: "0.85rem" }}>
                        Required: {obl.requiredArtifacts.join(", ")}
                        {obl.reviewCadenceDays
                          ? ` · review every ${obl.reviewCadenceDays}d`
                          : ""}
                      </div>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="panel fade-in">
        <div className="panel-pad">
          <h2 style={{ margin: 0, fontFamily: "var(--font-display)" }}>
            My systems & applicable policies
          </h2>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>System</th>
              <th>Tier</th>
              <th>Applicable policy tiers</th>
            </tr>
          </thead>
          <tbody>
            {mySystems.map((s) => {
              const applicable = Object.values(versions).filter((v) =>
                parseJsonArray(v.applicableRiskTiers).includes(s.riskTier ?? ""),
              );
              return (
                <tr key={s.id}>
                  <td>
                    <Link href={`/inventory/${s.id}`}>{s.name}</Link>
                  </td>
                  <td>{s.riskTier ?? "—"}</td>
                  <td>
                    {applicable.length === 0
                      ? "—"
                      : applicable.map((v) => {
                          const p = pols[v.policyId];
                          return (
                            <div key={v.id}>
                              {p ? (
                                <Link href={`/policies/${p.id}`}>{p.title}</Link>
                              ) : (
                                v.policyId
                              )}
                            </div>
                          );
                        })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="panel fade-in">
        <div className="panel-pad">
          <h2 style={{ margin: 0, fontFamily: "var(--font-display)" }}>
            Attestations
          </h2>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Policy version</th>
              <th>Due</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {myAtts.map((a) => {
              const version = versions[a.policyVersionId];
              const policy = version ? pols[version.policyId] : null;
              return (
                <tr key={a.id}>
                  <td>
                    {policy ? (
                      <Link href={`/policies/${policy.id}`}>{policy.title}</Link>
                    ) : (
                      a.policyVersionId
                    )}{" "}
                    {version ? `(v${version.version})` : ""}
                  </td>
                  <td>{a.dueAt ?? "—"}</td>
                  <td>
                    <StatusBadge value={a.status} />
                  </td>
                  <td>
                    {a.status === "pending" ? (
                      <form action={completeAttestationAction}>
                        <input type="hidden" name="attestationId" value={a.id} />
                        <button className="btn btn-primary" type="submit">
                          Acknowledge
                        </button>
                      </form>
                    ) : (
                      a.completedAt?.slice(0, 10) ?? "—"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
