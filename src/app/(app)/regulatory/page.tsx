import Link from "next/link";
import { createManualRegulatoryItemAction } from "@/app/actions/regulatory";
import { ExportLinks, PageHeader, StatusBadge } from "@/components/ui";
import { getCurrentUser, canWrite } from "@/lib/auth/session";
import { ensureDb } from "@/lib/db/ensure";
import { getDb } from "@/lib/db";
import { dispositions, regulatoryItems, regulatorySources } from "@/lib/db/schema";
import { labelize } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function RegulatoryPage() {
  ensureDb();
  const user = await getCurrentUser();
  const db = getDb();
  const sources = db.select().from(regulatorySources).all();
  const items = db.select().from(regulatoryItems).all();
  const disps = db.select().from(dispositions).all();
  const latestDisp = Object.fromEntries(
    disps
      .sort((a, b) => b.decidedAt.localeCompare(a.decidedAt))
      .map((d) => [d.itemId, d]),
  );

  return (
    <div className="stack">
      <PageHeader
        title="Regulatory Watch"
        description="Disposition log for regulatory and standards developments — the product is the triage trail, not the feed."
        actions={<ExportLinks basePath="/api/export/regulatory" />}
      />

      <div className="panel panel-pad fade-in">
        <h2 style={{ margin: "0 0 0.75rem", fontFamily: "var(--font-display)" }}>
          Watched sources
        </h2>
        <div className="stack" style={{ gap: "0.45rem" }}>
          {sources.map((s) => (
            <div key={s.id}>
              <strong>{s.name}</strong>{" "}
              <span className="muted">
                ({s.region} · {s.feedType})
              </span>
              <div className="muted" style={{ fontSize: "0.85rem" }}>
                {s.url}
              </div>
            </div>
          ))}
        </div>
        <p className="muted" style={{ marginBottom: 0, marginTop: "0.75rem", fontSize: "0.85rem" }}>
          Feed fetching is optional and degrades gracefully without outbound network access. Use manual entry below when offline.
        </p>
      </div>

      {user && canWrite(user.role) ? (
        <form action={createManualRegulatoryItemAction} className="panel panel-pad form-grid fade-in">
          <h2 style={{ margin: 0, fontFamily: "var(--font-display)" }}>Manual item</h2>
          <label>
            Title
            <input name="title" required />
          </label>
          <label>
            Summary
            <textarea name="summary" />
          </label>
          <label>
            URL
            <input name="url" />
          </label>
          <label>
            Published
            <input type="date" name="publishedAt" defaultValue={new Date().toISOString().slice(0, 10)} />
          </label>
          <button className="btn btn-primary" type="submit">
            Add to triage queue
          </button>
        </form>
      ) : null}

      <div className="panel fade-in">
        <div className="panel-pad">
          <h2 style={{ margin: 0, fontFamily: "var(--font-display)" }}>Triage queue & disposition log</h2>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Status</th>
              <th>Disposition</th>
              <th>Published</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const d = latestDisp[item.id];
              return (
                <tr key={item.id}>
                  <td>
                    <Link href={`/regulatory/${item.id}`} style={{ fontWeight: 600 }}>
                      {item.title}
                    </Link>
                    <div className="muted" style={{ fontSize: "0.85rem" }}>
                      {item.summary}
                    </div>
                  </td>
                  <td>
                    <StatusBadge value={item.status} />
                  </td>
                  <td>{d ? labelize(d.disposition) : "—"}</td>
                  <td>{item.publishedAt ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
