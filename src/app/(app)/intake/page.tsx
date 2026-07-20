import Link from "next/link";
import { ExportLinks, PageHeader, StatusBadge } from "@/components/ui";
import { getCurrentUser, canSubmit, canWrite } from "@/lib/auth/session";
import { ensureDb } from "@/lib/db/ensure";
import { getDb } from "@/lib/db";
import { intakeSubmissions, users } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function IntakeListPage() {
  ensureDb();
  const user = await getCurrentUser();
  const db = getDb();
  const rows = db.select().from(intakeSubmissions).all();
  const names = Object.fromEntries(db.select().from(users).all().map((u) => [u.id, u.name]));
  const now = new Date().toISOString();

  return (
    <div className="stack">
      <PageHeader
        title="Use-Case Intake & Risk Evaluation"
        description="Front door of the governance program — submissions, SLA aging, scoring, and obligation sets."
        actions={
          <>
            <ExportLinks basePath="/api/export/intake" />
            {user && canSubmit(user.role) ? (
              <Link className="btn btn-primary" href="/intake/new">
                New submission
              </Link>
            ) : null}
          </>
        }
      />
      <div className="panel fade-in">
        <table className="table">
          <thead>
            <tr>
              <th>Submission</th>
              <th>Status</th>
              <th>Tier</th>
              <th>Submitter</th>
              <th>SLA</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const aging =
                row.slaDueAt &&
                (row.status === "submitted" || row.status === "in_review") &&
                row.slaDueAt < now;
              return (
                <tr key={row.id}>
                  <td>
                    <Link href={`/intake/${row.id}`} style={{ fontWeight: 600 }}>
                      {row.title}
                    </Link>
                    <div className="muted" style={{ fontSize: "0.85rem" }}>
                      {row.useCaseCategory}
                    </div>
                  </td>
                  <td>
                    <StatusBadge value={row.status} />
                  </td>
                  <td>{row.resultingTier ? <StatusBadge value={row.resultingTier} /> : "—"}</td>
                  <td>{names[row.submitterId] ?? "—"}</td>
                  <td>
                    {row.slaDueAt ? row.slaDueAt.slice(0, 10) : "—"}
                    {aging ? (
                      <div>
                        <StatusBadge value="overdue" />
                      </div>
                    ) : null}
                    {user && canWrite(user.role) && aging ? (
                      <div className="muted" style={{ fontSize: "0.8rem" }}>
                        Needs evaluator attention
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
