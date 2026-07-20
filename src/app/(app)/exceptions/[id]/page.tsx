import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { renewExceptionAction } from "@/app/actions/exceptions";
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
import { aiSystems, exceptions, policies, users } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function ExceptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  ensureDb();
  const { id } = await params;
  const user = await getCurrentUser();
  const db = getDb();
  const row = db.select().from(exceptions).where(eq(exceptions.id, id)).get();
  if (!row) notFound();
  const system = db.select().from(aiSystems).where(eq(aiSystems.id, row.systemId)).get();
  const policy = db.select().from(policies).where(eq(policies.id, row.policyId)).get();
  const names = Object.fromEntries(db.select().from(users).all().map((u) => [u.id, u.name]));
  const people = db.select().from(users).all();

  return (
    <div className="stack">
      <BackLink href="/exceptions" label="Back to exceptions" />
      <PageHeader
        title={row.requirementSummary}
        description={`Version ${row.version}`}
        actions={
          <>
            <ExportLinks basePath={`/api/export/exceptions/${id}`} />
            <StatusBadge value={row.status} />
          </>
        }
      />
      <div className="panel panel-pad stack fade-in">
        <KeyValue label="System">
          {system ? <Link href={`/inventory/${system.id}`}>{system.name}</Link> : row.systemId}
        </KeyValue>
        <KeyValue label="Policy">
          {policy ? <Link href={`/policies/${policy.id}`}>{policy.title}</Link> : row.policyId}
        </KeyValue>
        <KeyValue label="Rationale">{row.rationale}</KeyValue>
        <KeyValue label="Compensating controls">{row.compensatingControls}</KeyValue>
        <KeyValue label="Risk acceptor">{names[row.riskAcceptorId] ?? "—"}</KeyValue>
        <KeyValue label="Expires">{row.expiresAt}</KeyValue>
      </div>
      {user && canWrite(user.role) && row.status === "active" ? (
        <form action={renewExceptionAction} className="panel panel-pad form-grid fade-in">
          <h2 style={{ margin: 0, fontFamily: "var(--font-display)" }}>Renew (creates new version)</h2>
          <input type="hidden" name="exceptionId" value={row.id} />
          <label>
            Updated rationale
            <textarea name="rationale" defaultValue={row.rationale} />
          </label>
          <label>
            Compensating controls
            <textarea name="compensatingControls" defaultValue={row.compensatingControls} />
          </label>
          <label>
            Risk acceptor
            <select name="riskAcceptorId" defaultValue={row.riskAcceptorId}>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            New expiry date
            <input type="date" name="expiresAt" required />
          </label>
          <button className="btn btn-primary" type="submit">
            Renew exception
          </button>
        </form>
      ) : null}
    </div>
  );
}
