import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import {
  transitionLifecycleAction,
  updateReviewDateAction,
} from "@/app/actions/inventory";
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
  actionItems,
  aiSystemLifecycleEvents,
  aiSystems,
  decisions,
  exceptions,
  intakeSubmissions,
  lifecycleStates,
  policies,
  users,
} from "@/lib/db/schema";
import { labelize, parseJsonArray } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function InventoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  ensureDb();
  const { id } = await params;
  const user = await getCurrentUser();
  const db = getDb();
  const system = db.select().from(aiSystems).where(eq(aiSystems.id, id)).get();
  if (!system) notFound();

  const events = db
    .select()
    .from(aiSystemLifecycleEvents)
    .where(eq(aiSystemLifecycleEvents.systemId, id))
    .orderBy(desc(aiSystemLifecycleEvents.changedAt))
    .all();
  const intakes = db
    .select()
    .from(intakeSubmissions)
    .where(eq(intakeSubmissions.linkedSystemId, id))
    .all();
  const excs = db.select().from(exceptions).where(eq(exceptions.systemId, id)).all();
  const allDecisions = db.select().from(decisions).all().filter((d) =>
    parseJsonArray(d.linkedSystemIds).includes(id),
  );
  const openActions = db
    .select()
    .from(actionItems)
    .where(eq(actionItems.status, "open"))
    .all();
  const policyRows = db.select().from(policies).all();
  const owners = Object.fromEntries(db.select().from(users).all().map((u) => [u.id, u.name]));
  const applicablePolicies = policyRows.filter(() => system.riskTier);

  return (
    <div className="stack">
      <BackLink href="/inventory" label="Back to inventory" />
      <PageHeader
        title={system.name}
        description={system.description}
        actions={
          <>
            <ExportLinks basePath={`/api/export/inventory/${id}`} />
            <StatusBadge value={system.lifecycleState} />
          </>
        }
      />
      <div className="metrics fade-in">
        <div className="metric">
          <div className="muted">Risk tier</div>
          <div className="value" style={{ fontSize: "1.3rem" }}>
            {system.riskTier ? labelize(system.riskTier) : "Unset"}
          </div>
        </div>
        <div className="metric">
          <div className="muted">EU classification</div>
          <div className="value" style={{ fontSize: "1.3rem" }}>
            {system.euClassification ? labelize(system.euClassification) : "Unset"}
          </div>
        </div>
        <div className="metric">
          <div className="muted">Next review</div>
          <div className="value" style={{ fontSize: "1.3rem" }}>
            {system.nextReviewDate ?? "—"}
          </div>
        </div>
      </div>

      <div className="panel panel-pad stack fade-in">
        <h2 style={{ margin: 0, fontFamily: "var(--font-display)" }}>Details</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "1rem" }}>
          <KeyValue label="Intended purpose">{system.intendedPurpose}</KeyValue>
          <KeyValue label="Deployment context">{system.deploymentContext || "—"}</KeyValue>
          <KeyValue label="Vendor type">{labelize(system.vendorType)}</KeyValue>
          <KeyValue label="Business owner">
            {system.businessOwnerId ? owners[system.businessOwnerId] : "—"}
          </KeyValue>
          <KeyValue label="Technical owner">
            {system.technicalOwnerId ? owners[system.technicalOwnerId] : "—"}
          </KeyValue>
          <KeyValue label="Data categories">
            <div className="chip-row">
              {parseJsonArray(system.dataCategories).map((c) => (
                <span className="chip" key={c}>
                  {c}
                </span>
              ))}
            </div>
          </KeyValue>
          <KeyValue label="Model / vendor dependencies">
            <div className="chip-row">
              {parseJsonArray(system.modelDependencies).map((c) => (
                <span className="chip" key={c}>
                  {c}
                </span>
              ))}
            </div>
          </KeyValue>
        </div>
      </div>

      <div className="panel panel-pad stack fade-in">
        <h2 style={{ margin: 0, fontFamily: "var(--font-display)" }}>Linked artifacts</h2>
        <KeyValue label="Intake evaluations">
          {intakes.length === 0
            ? "—"
            : intakes.map((i) => (
                <div key={i.id}>
                  <Link href={`/intake/${i.id}`}>{i.title}</Link> ({i.status}
                  {i.resultingTier ? ` · ${i.resultingTier}` : ""})
                </div>
              ))}
        </KeyValue>
        <KeyValue label="Open exceptions">
          {excs.filter((e) => e.status === "active").length === 0
            ? "—"
            : excs
                .filter((e) => e.status === "active")
                .map((e) => (
                  <div key={e.id}>
                    <Link href={`/exceptions/${e.id}`}>{e.requirementSummary}</Link>{" "}
                    (expires {e.expiresAt})
                  </div>
                ))}
        </KeyValue>
        <KeyValue label="Committee decisions">
          {allDecisions.length === 0
            ? "—"
            : allDecisions.map((d) => (
                <div key={d.id}>
                  <Link href={`/committee/${d.meetingId}`}>{d.summary}</Link>
                </div>
              ))}
        </KeyValue>
        <KeyValue label="Related open actions">
          {openActions.length === 0
            ? "—"
            : openActions.slice(0, 5).map((a) => (
                <div key={a.id}>{a.title}</div>
              ))}
        </KeyValue>
        <KeyValue label="Policies by risk tier">
          {system.riskTier
            ? applicablePolicies
                .slice(0, 5)
                .map((p) => (
                  <div key={p.id}>
                    <Link href={`/policies/${p.id}`}>{p.title}</Link>
                  </div>
                ))
            : "Set a risk tier to surface applicable policies."}
        </KeyValue>
      </div>

      {user && canWrite(user.role) ? (
        <div className="panel panel-pad stack fade-in">
          <h2 style={{ margin: 0, fontFamily: "var(--font-display)" }}>Lifecycle transition</h2>
          <form action={transitionLifecycleAction} className="form-grid">
            <input type="hidden" name="systemId" value={system.id} />
            <label>
              New state
              <select name="toState" defaultValue={system.lifecycleState}>
                {lifecycleStates.map((s) => (
                  <option key={s} value={s}>
                    {labelize(s)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Reason
              <textarea name="reason" required placeholder="Why is this state changing?" />
            </label>
            <button className="btn btn-primary" type="submit">
              Record transition
            </button>
          </form>
          <form action={updateReviewDateAction} className="form-grid">
            <input type="hidden" name="systemId" value={system.id} />
            <label>
              Next review date
              <input type="date" name="nextReviewDate" defaultValue={system.nextReviewDate ?? ""} />
            </label>
            <button className="btn btn-secondary" type="submit">
              Update review date
            </button>
          </form>
        </div>
      ) : null}

      <div className="panel fade-in">
        <div className="panel-pad">
          <h2 style={{ margin: 0, fontFamily: "var(--font-display)" }}>Lifecycle history</h2>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>When</th>
              <th>Change</th>
              <th>Reason</th>
              <th>By</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id}>
                <td>{e.changedAt.slice(0, 19).replace("T", " ")}</td>
                <td>
                  {e.fromState ? labelize(e.fromState) : "—"} → {labelize(e.toState)}
                </td>
                <td>{e.reason}</td>
                <td>{e.changedById ? owners[e.changedById] ?? e.changedById : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
