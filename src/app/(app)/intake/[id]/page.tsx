import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { approveIntakeAction, evaluateIntakeAction } from "@/app/actions/intake";
import {
  BackLink,
  ExportLinks,
  KeyValue,
  PageHeader,
  StatusBadge,
} from "@/components/ui";
import { getCurrentUser, canWrite } from "@/lib/auth/session";
import { ensureDb } from "@/lib/db/ensure";
import { getDb } from "@/lib/db";
import {
  evaluationGateAnswers,
  evaluationScores,
  hardGates,
  intakeSubmissions,
  riskFactors,
  riskMethodologyVersions,
  tierObligations,
  users,
} from "@/lib/db/schema";
import { labelize, parseJsonObject } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function IntakeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  ensureDb();
  const { id } = await params;
  const user = await getCurrentUser();
  const db = getDb();
  const intake = db.select().from(intakeSubmissions).where(eq(intakeSubmissions.id, id)).get();
  if (!intake) notFound();

  const method = intake.methodologyVersionId
    ? db
        .select()
        .from(riskMethodologyVersions)
        .where(eq(riskMethodologyVersions.id, intake.methodologyVersionId))
        .get()
    : null;
  const factors = intake.methodologyVersionId
    ? db
        .select()
        .from(riskFactors)
        .where(eq(riskFactors.methodologyVersionId, intake.methodologyVersionId))
        .all()
        .sort((a, b) => a.sortOrder - b.sortOrder)
    : [];
  const gates = intake.methodologyVersionId
    ? db
        .select()
        .from(hardGates)
        .where(eq(hardGates.methodologyVersionId, intake.methodologyVersionId))
        .all()
    : [];
  const scores = db
    .select()
    .from(evaluationScores)
    .where(eq(evaluationScores.intakeId, id))
    .all();
  const gateAnswers = db
    .select()
    .from(evaluationGateAnswers)
    .where(eq(evaluationGateAnswers.intakeId, id))
    .all();
  const obligations = intake.methodologyVersionId
    ? db
        .select()
        .from(tierObligations)
        .where(eq(tierObligations.methodologyVersionId, intake.methodologyVersionId))
        .all()
    : [];
  const names = Object.fromEntries(db.select().from(users).all().map((u) => [u.id, u.name]));
  const obligation = parseJsonObject<{
    tier?: string;
    requiredArtifacts?: string[];
    requiredApprovals?: string[];
    reviewCadenceDays?: number;
    blocked?: boolean;
  }>(intake.obligationSnapshot);
  const canEvaluate =
    user &&
    canWrite(user.role) &&
    (intake.status === "submitted" || intake.status === "in_review" || intake.status === "evaluated");

  return (
    <div className="stack">
      <BackLink href="/intake" label="Back to intake queue" />
      <PageHeader
        title={intake.title}
        description={intake.purpose}
        actions={
          <>
            <ExportLinks basePath={`/api/export/intake/${id}`} />
            <StatusBadge value={intake.status} />
          </>
        }
      />

      <div className="panel panel-pad stack fade-in">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "1rem" }}>
          <KeyValue label="Category">{labelize(intake.useCaseCategory)}</KeyValue>
          <KeyValue label="Submitter">{names[intake.submitterId] ?? "—"}</KeyValue>
          <KeyValue label="SLA due">{intake.slaDueAt?.slice(0, 10) ?? "—"}</KeyValue>
          <KeyValue label="Methodology">
            {method ? `${method.name} (v${method.version})` : "—"}
          </KeyValue>
          <KeyValue label="Data involved">{intake.dataInvolved}</KeyValue>
          <KeyValue label="Affected populations">{intake.affectedPopulations}</KeyValue>
          <KeyValue label="Vendor / model">{intake.vendorModelDetails}</KeyValue>
          <KeyValue label="Linked inventory">
            {intake.linkedSystemId ? (
              <Link href={`/inventory/${intake.linkedSystemId}`}>Open system</Link>
            ) : (
              "—"
            )}
          </KeyValue>
        </div>
      </div>

      {intake.compositeScore != null ? (
        <div className="panel panel-pad stack fade-in">
          <h2 style={{ margin: 0, fontFamily: "var(--font-display)" }}>Evaluation result</h2>
          <div className="metrics">
            <div className="metric">
              <div className="muted">Composite score</div>
              <div className="value">{intake.compositeScore}</div>
            </div>
            <div className="metric">
              <div className="muted">Resulting tier</div>
              <div className="value" style={{ fontSize: "1.4rem" }}>
                {intake.resultingTier ? labelize(intake.resultingTier) : "—"}
              </div>
            </div>
          </div>
          <KeyValue label="Decomposed factor scores">
            <table className="table">
              <thead>
                <tr>
                  <th>Factor</th>
                  <th>Score</th>
                  <th>Weight</th>
                  <th>Rationale</th>
                </tr>
              </thead>
              <tbody>
                {scores.map((s) => {
                  const factor = factors.find((f) => f.id === s.factorId);
                  return (
                    <tr key={s.id}>
                      <td>{factor?.label ?? s.factorId}</td>
                      <td>{s.score}</td>
                      <td>{factor?.weight ?? "—"}</td>
                      <td>{s.rationale}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </KeyValue>
          <KeyValue label="Hard gates">
            {gateAnswers.map((g) => {
              const gate = gates.find((x) => x.id === g.gateId);
              return (
                <div key={g.id}>
                  <StatusBadge value={g.triggered ? "high" : "low"} />{" "}
                  {gate?.label}: {g.triggered ? "Triggered" : "Not triggered"} — {g.rationale}
                </div>
              );
            })}
          </KeyValue>
          <KeyValue label="Obligation set">
            {obligation ? (
              <div className="stack">
                {obligation.blocked ? <StatusBadge value="critical" /> : null}
                {obligation.blocked ? <div>Approval blocked by hard gate.</div> : null}
                <div>
                  Artifacts: {(obligation.requiredArtifacts ?? []).join(", ") || "—"}
                </div>
                <div>
                  Approvals: {(obligation.requiredApprovals ?? []).join(", ") || "—"}
                </div>
                <div>Review cadence: {obligation.reviewCadenceDays ?? "—"} days</div>
              </div>
            ) : (
              "—"
            )}
          </KeyValue>
          <KeyValue label="Evaluator notes">{intake.evaluationRationale || "—"}</KeyValue>
          {user &&
          canWrite(user.role) &&
          intake.status === "evaluated" &&
          !obligation?.blocked ? (
            <form action={approveIntakeAction}>
              <input type="hidden" name="intakeId" value={intake.id} />
              <button className="btn btn-accent" type="submit">
                Approve & create/link inventory record
              </button>
            </form>
          ) : null}
        </div>
      ) : null}

      {canEvaluate && factors.length > 0 ? (
        <form action={evaluateIntakeAction} className="panel panel-pad form-grid fade-in">
          <h2 style={{ margin: 0, fontFamily: "var(--font-display)" }}>
            Score with methodology {method?.name}
          </h2>
          <input type="hidden" name="intakeId" value={intake.id} />
          {factors.map((factor) => (
            <div key={factor.id} className="stack" style={{ gap: "0.45rem" }}>
              <strong>
                {factor.label}{" "}
                <span className="muted">(weight {factor.weight})</span>
              </strong>
              <div className="muted" style={{ fontSize: "0.85rem" }}>
                {factor.guidance}
              </div>
              <label>
                Score (1–5)
                <input
                  type="number"
                  name={`factor_${factor.id}`}
                  min={1}
                  max={5}
                  required
                  defaultValue={scores.find((s) => s.factorId === factor.id)?.score}
                />
              </label>
              <label>
                Rationale
                <textarea
                  name={`factor_rationale_${factor.id}`}
                  required
                  defaultValue={scores.find((s) => s.factorId === factor.id)?.rationale}
                />
              </label>
            </div>
          ))}
          <h3 style={{ margin: "0.5rem 0 0", fontFamily: "var(--font-display)" }}>Hard gates</h3>
          {gates.map((gate) => (
            <div key={gate.id} className="stack" style={{ gap: "0.45rem" }}>
              <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <input
                  type="checkbox"
                  name={`gate_${gate.id}`}
                  defaultChecked={
                    gateAnswers.find((g) => g.gateId === gate.id)?.triggered ?? false
                  }
                />
                {gate.label}
              </label>
              <div className="muted" style={{ fontSize: "0.85rem" }}>
                {gate.description} — effect: {gate.effect}
                {gate.forcedTier ? ` → ${gate.forcedTier}` : ""}
                {gate.blocksApproval ? " (blocks approval)" : ""}
              </div>
              <label>
                Rationale
                <textarea
                  name={`gate_rationale_${gate.id}`}
                  required
                  defaultValue={
                    gateAnswers.find((g) => g.gateId === gate.id)?.rationale ?? ""
                  }
                />
              </label>
            </div>
          ))}
          <label>
            Overall evaluation notes
            <textarea
              name="evaluationRationale"
              defaultValue={intake.evaluationRationale ?? ""}
            />
          </label>
          <div className="muted" style={{ fontSize: "0.85rem" }}>
            Tier obligation reference:{" "}
            {obligations
              .map((o) => `${o.tier}→${o.reviewCadenceDays}d`)
              .join(" · ")}
          </div>
          <button className="btn btn-primary" type="submit">
            Save evaluation
          </button>
        </form>
      ) : null}
    </div>
  );
}
