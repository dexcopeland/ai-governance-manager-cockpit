import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { dispositionItemAction } from "@/app/actions/regulatory";
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
  dispositions,
  regulatoryItems,
  regulatorySources,
  users,
} from "@/lib/db/schema";
import { labelize, parseJsonArray } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function RegulatoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  ensureDb();
  const { id } = await params;
  const user = await getCurrentUser();
  const db = getDb();
  const item = db.select().from(regulatoryItems).where(eq(regulatoryItems.id, id)).get();
  if (!item) notFound();
  const source = item.sourceId
    ? db.select().from(regulatorySources).where(eq(regulatorySources.id, item.sourceId)).get()
    : null;
  const history = db
    .select()
    .from(dispositions)
    .where(eq(dispositions.itemId, id))
    .all();
  const names = Object.fromEntries(db.select().from(users).all().map((u) => [u.id, u.name]));

  return (
    <div className="stack">
      <BackLink href="/regulatory" label="Back to regulatory watch" />
      <PageHeader
        title={item.title}
        description={item.summary || "Regulatory item"}
        actions={
          <>
            <ExportLinks basePath={`/api/export/regulatory/${id}`} />
            <StatusBadge value={item.status} />
          </>
        }
      />
      <div className="panel panel-pad stack fade-in">
        <KeyValue label="Source">{source?.name ?? "Manual entry"}</KeyValue>
        <KeyValue label="URL">
          {item.url ? (
            <a href={item.url} target="_blank" rel="noreferrer">
              {item.url}
            </a>
          ) : (
            "—"
          )}
        </KeyValue>
        <KeyValue label="Published">{item.publishedAt ?? "—"}</KeyValue>
      </div>

      {user && canWrite(user.role) && item.status === "pending" ? (
        <form action={dispositionItemAction} className="panel panel-pad form-grid fade-in">
          <h2 style={{ margin: 0, fontFamily: "var(--font-display)" }}>Disposition</h2>
          <input type="hidden" name="itemId" value={item.id} />
          <label>
            Decision
            <select name="disposition" defaultValue="monitor">
              <option value="no_impact">No impact</option>
              <option value="monitor">Monitor</option>
              <option value="action_required">Action required</option>
            </select>
          </label>
          <label>
            Notes
            <textarea name="notes" required />
          </label>
          <label>
            Linked policy IDs (comma-separated)
            <input name="linkedPolicyIds" />
          </label>
          <label>
            Linked system IDs (comma-separated)
            <input name="linkedSystemIds" />
          </label>
          <label>
            Action title (if action required)
            <input name="actionTitle" />
          </label>
          <label>
            Action due
            <input type="date" name="actionDueAt" />
          </label>
          <button className="btn btn-primary" type="submit">
            Record disposition
          </button>
        </form>
      ) : null}

      <div className="panel fade-in">
        <div className="panel-pad">
          <h2 style={{ margin: 0, fontFamily: "var(--font-display)" }}>
            Disposition history
          </h2>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>When</th>
              <th>Disposition</th>
              <th>Notes</th>
              <th>Decider</th>
              <th>Links</th>
            </tr>
          </thead>
          <tbody>
            {history.map((d) => (
              <tr key={d.id}>
                <td>{d.decidedAt.slice(0, 19).replace("T", " ")}</td>
                <td>{labelize(d.disposition)}</td>
                <td>{d.notes}</td>
                <td>{d.decidedById ? names[d.decidedById] : "—"}</td>
                <td>
                  {parseJsonArray(d.linkedPolicyIds).map((pid) => (
                    <div key={pid}>
                      <Link href={`/policies/${pid}`}>Policy</Link>
                    </div>
                  ))}
                  {parseJsonArray(d.linkedSystemIds).map((sid) => (
                    <div key={sid}>
                      <Link href={`/inventory/${sid}`}>System</Link>
                    </div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
