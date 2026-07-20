import { redirect } from "next/navigation";
import { createExceptionAction } from "@/app/actions/exceptions";
import { BackLink, PageHeader } from "@/components/ui";
import { getCurrentUser, canWrite } from "@/lib/auth/session";
import { ensureDb } from "@/lib/db/ensure";
import { getDb } from "@/lib/db";
import { aiSystems, policies, users } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function NewExceptionPage() {
  ensureDb();
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role)) redirect("/exceptions");
  const db = getDb();
  const systems = db.select().from(aiSystems).all();
  const pols = db.select().from(policies).all();
  const people = db.select().from(users).all();

  return (
    <div className="stack">
      <BackLink href="/exceptions" label="Back to exceptions" />
      <PageHeader title="New exception" description="Named risk acceptor and mandatory expiry required." />
      <form action={createExceptionAction} className="panel panel-pad form-grid fade-in">
        <label>
          Inventory system
          <select name="systemId" required>
            {systems.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Policy / requirement
          <select name="policyId" required>
            {pols.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Requirement summary
          <input name="requirementSummary" required />
        </label>
        <label>
          Rationale
          <textarea name="rationale" required />
        </label>
        <label>
          Compensating controls
          <textarea name="compensatingControls" required />
        </label>
        <label>
          Named risk acceptor
          <select name="riskAcceptorId" required>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.role})
              </option>
            ))}
          </select>
        </label>
        <label>
          Expiry date (mandatory)
          <input type="date" name="expiresAt" required />
        </label>
        <button className="btn btn-primary" type="submit">
          Create exception
        </button>
      </form>
    </div>
  );
}
