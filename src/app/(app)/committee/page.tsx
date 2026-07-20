import Link from "next/link";
import { ExportLinks, PageHeader, StatusBadge } from "@/components/ui";
import { getCurrentUser, canCommittee } from "@/lib/auth/session";
import { ensureDb } from "@/lib/db/ensure";
import { getDb } from "@/lib/db";
import { actionItems, decisions, meetings } from "@/lib/db/schema";
import { createMeetingAction } from "@/app/actions/committee";

export const dynamic = "force-dynamic";

export default async function CommitteePage() {
  ensureDb();
  const user = await getCurrentUser();
  const db = getDb();
  const rows = db.select().from(meetings).all();
  const decisionCount = db.select().from(decisions).all().length;
  const openActions = db
    .select()
    .from(actionItems)
    .all()
    .filter((a) => a.status === "open");

  return (
    <div className="stack">
      <PageHeader
        title="Governance Committee"
        description="Auto-generated agendas, meeting records, and a permanent decision register."
        actions={<ExportLinks basePath="/api/export/meetings" />}
      />
      <div className="metrics fade-in">
        <div className="metric">
          <div className="muted">Meetings</div>
          <div className="value">{rows.length}</div>
        </div>
        <div className="metric">
          <div className="muted">Decisions recorded</div>
          <div className="value">{decisionCount}</div>
        </div>
        <div className="metric">
          <div className="muted">Open action items</div>
          <div className="value">{openActions.length}</div>
        </div>
      </div>

      {user && canCommittee(user.role) ? (
        <form action={createMeetingAction} className="panel panel-pad form-grid fade-in">
          <h2 style={{ margin: 0, fontFamily: "var(--font-display)" }}>
            Schedule meeting (auto-builds agenda from triage)
          </h2>
          <label>
            Title
            <input name="title" required defaultValue="AI Governance Committee" />
          </label>
          <label>
            Date
            <input type="date" name="meetingDate" required />
          </label>
          <label>
            Attendees (comma-separated)
            <input name="attendees" placeholder="Morgan Governance, Casey Committee" />
          </label>
          <label>
            Manual agenda item (optional)
            <input name="manualAgenda" />
          </label>
          <button className="btn btn-primary" type="submit">
            Create meeting
          </button>
        </form>
      ) : null}

      <div className="panel fade-in">
        <table className="table">
          <thead>
            <tr>
              <th>Meeting</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <Link href={`/committee/${row.id}`} style={{ fontWeight: 600 }}>
                    {row.title}
                  </Link>
                </td>
                <td>{row.meetingDate}</td>
                <td>
                  <StatusBadge value={row.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel fade-in">
        <div className="panel-pad">
          <h2 style={{ margin: 0, fontFamily: "var(--font-display)" }}>
            Decision register (all meetings)
          </h2>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Decision</th>
              <th>Meeting</th>
              <th>Conditions</th>
            </tr>
          </thead>
          <tbody>
            {db
              .select()
              .from(decisions)
              .all()
              .map((d) => (
                <tr key={d.id}>
                  <td>
                    <Link href={`/committee/${d.meetingId}`}>{d.summary}</Link>
                    <div className="muted" style={{ fontSize: "0.85rem" }}>
                      {d.rationale}
                    </div>
                  </td>
                  <td>{d.meetingId.slice(0, 12)}…</td>
                  <td>{d.conditions || "—"}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
