import Link from "next/link";
import { PageHeader, StatusBadge } from "@/components/ui";
import { ensureDb } from "@/lib/db/ensure";
import { getTriageItems } from "@/lib/triage";

export const dynamic = "force-dynamic";

export default function TriagePage() {
  ensureDb();
  const items = getTriageItems();
  const critical = items.filter((i) => i.urgency === "critical").length;

  return (
    <div className="stack">
      <PageHeader
        title="Triage Inbox"
        description="Everything awaiting the governance manager across intake, reviews, exceptions, regulatory items, actions, and attestations."
      />
      <div className="metrics fade-in">
        <div className="metric">
          <div className="muted">Open items</div>
          <div className="value">{items.length}</div>
        </div>
        <div className="metric">
          <div className="muted">Critical</div>
          <div className="value">{critical}</div>
        </div>
      </div>
      <div className="panel fade-in">
        {items.length === 0 ? (
          <div className="empty">Inbox clear — nothing waiting.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Urgency</th>
                <th>Module</th>
                <th>Item</th>
                <th>Due</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <StatusBadge value={item.urgency} />
                  </td>
                  <td>{item.module}</td>
                  <td>
                    <Link href={item.href} style={{ fontWeight: 600 }}>
                      {item.title}
                    </Link>
                    <div className="muted" style={{ fontSize: "0.85rem" }}>
                      {item.detail}
                    </div>
                  </td>
                  <td>{item.dueAt ? item.dueAt.slice(0, 10) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
