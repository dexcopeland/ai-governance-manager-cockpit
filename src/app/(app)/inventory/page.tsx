import Link from "next/link";
import { ExportLinks, PageHeader, StatusBadge } from "@/components/ui";
import { getCurrentUser, canWrite } from "@/lib/auth/session";
import { ensureDb } from "@/lib/db/ensure";
import { getDb } from "@/lib/db";
import { aiSystems } from "@/lib/db/schema";
import { labelize } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tier?: string; state?: string }>;
}) {
  ensureDb();
  const user = await getCurrentUser();
  const params = await searchParams;
  const db = getDb();
  let rows = db.select().from(aiSystems).all();
  if (params.q) {
    const q = params.q.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q),
    );
  }
  if (params.tier) rows = rows.filter((r) => r.riskTier === params.tier);
  if (params.state) rows = rows.filter((r) => r.lifecycleState === params.state);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="stack">
      <PageHeader
        title="AI Inventory"
        description="Registry of AI systems and use cases — the root object every other module references."
        actions={
          <>
            <ExportLinks basePath="/api/export/inventory" />
            {user && canWrite(user.role) ? (
              <Link className="btn btn-primary" href="/inventory/new">
                Register system
              </Link>
            ) : null}
          </>
        }
      />
      <form className="panel panel-pad fade-in" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <input name="q" placeholder="Search systems…" defaultValue={params.q} style={{ flex: 1, minWidth: 180, padding: "0.5rem 0.7rem", border: "1px solid var(--line)", borderRadius: "0.4rem" }} />
        <select name="tier" defaultValue={params.tier ?? ""} style={{ padding: "0.5rem", border: "1px solid var(--line)", borderRadius: "0.4rem" }}>
          <option value="">All tiers</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <select name="state" defaultValue={params.state ?? ""} style={{ padding: "0.5rem", border: "1px solid var(--line)", borderRadius: "0.4rem" }}>
          <option value="">All states</option>
          <option value="proposed">Proposed</option>
          <option value="in_review">In review</option>
          <option value="approved">Approved</option>
          <option value="deployed">Deployed</option>
          <option value="under_monitoring">Under monitoring</option>
          <option value="decommissioned">Decommissioned</option>
        </select>
        <button className="btn btn-secondary" type="submit">Filter</button>
      </form>
      <div className="panel fade-in">
        <table className="table">
          <thead>
            <tr>
              <th>System</th>
              <th>Lifecycle</th>
              <th>Risk tier</th>
              <th>EU class</th>
              <th>Next review</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const overdue = row.nextReviewDate && row.nextReviewDate < today;
              return (
                <tr key={row.id}>
                  <td>
                    <Link href={`/inventory/${row.id}`} style={{ fontWeight: 600 }}>
                      {row.name}
                    </Link>
                    <div className="muted" style={{ fontSize: "0.85rem" }}>
                      {row.vendorType.replace(/_/g, " ")} · {row.intendedPurpose.slice(0, 80)}
                    </div>
                  </td>
                  <td>
                    <StatusBadge value={row.lifecycleState} />
                  </td>
                  <td>{row.riskTier ? <StatusBadge value={row.riskTier} /> : "—"}</td>
                  <td>{row.euClassification ? labelize(row.euClassification) : "—"}</td>
                  <td>
                    {row.nextReviewDate ?? "—"}
                    {overdue ? (
                      <div>
                        <StatusBadge value="overdue" />
                      </div>
                    ) : null}
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
