import Link from "next/link";
import { ExportLinks, PageHeader, StatusBadge } from "@/components/ui";
import { getCurrentUser, canWrite } from "@/lib/auth/session";
import { ensureDb } from "@/lib/db/ensure";
import { getDb } from "@/lib/db";
import { aiSystems, exceptions, policies, users } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function ExceptionsPage() {
  ensureDb();
  const user = await getCurrentUser();
  const db = getDb();
  const rows = db.select().from(exceptions).all();
  const systems = Object.fromEntries(db.select().from(aiSystems).all().map((s) => [s.id, s.name]));
  const pols = Object.fromEntries(db.select().from(policies).all().map((p) => [p.id, p.title]));
  const names = Object.fromEntries(db.select().from(users).all().map((u) => [u.id, u.name]));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="stack">
      <PageHeader
        title="Exceptions & Waivers"
        description="Managed non-compliance with mandatory expiry — no indefinite exceptions."
        actions={
          <>
            <ExportLinks basePath="/api/export/exceptions" />
            {user && canWrite(user.role) ? (
              <Link className="btn btn-primary" href="/exceptions/new">
                New exception
              </Link>
            ) : null}
          </>
        }
      />
      <div className="panel fade-in">
        <table className="table">
          <thead>
            <tr>
              <th>Requirement</th>
              <th>System</th>
              <th>Policy</th>
              <th>Acceptor</th>
              <th>Expires</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const expired = row.status === "active" && row.expiresAt < today;
              return (
                <tr key={row.id}>
                  <td>
                    <Link href={`/exceptions/${row.id}`} style={{ fontWeight: 600 }}>
                      {row.requirementSummary}
                    </Link>
                    <div className="muted" style={{ fontSize: "0.8rem" }}>
                      v{row.version}
                    </div>
                  </td>
                  <td>{systems[row.systemId] ?? row.systemId}</td>
                  <td>{pols[row.policyId] ?? row.policyId}</td>
                  <td>{names[row.riskAcceptorId] ?? "—"}</td>
                  <td>
                    {row.expiresAt}
                    {expired ? (
                      <div>
                        <StatusBadge value="expired" />
                      </div>
                    ) : null}
                  </td>
                  <td>
                    <StatusBadge value={row.status} />
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
