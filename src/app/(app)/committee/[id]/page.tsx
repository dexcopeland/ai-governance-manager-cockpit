import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import {
  addDecisionAction,
  saveMeetingNotesAction,
} from "@/app/actions/committee";
import {
  BackLink,
  ExportLinks,
  KeyValue,
  PageHeader,
  StatusBadge,
} from "@/components/ui";
import { getCurrentUser, canCommittee } from "@/lib/auth/session";
import { ensureDb } from "@/lib/db/ensure";
import { getDb } from "@/lib/db";
import {
  actionItems,
  agendaItems,
  decisions,
  meetings,
  users,
} from "@/lib/db/schema";
import { parseJsonArray } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  ensureDb();
  const { id } = await params;
  const user = await getCurrentUser();
  const db = getDb();
  const meeting = db.select().from(meetings).where(eq(meetings.id, id)).get();
  if (!meeting) notFound();
  const agenda = db
    .select()
    .from(agendaItems)
    .where(eq(agendaItems.meetingId, id))
    .all()
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const decs = db.select().from(decisions).where(eq(decisions.meetingId, id)).all();
  const actions = db
    .select()
    .from(actionItems)
    .where(eq(actionItems.meetingId, id))
    .all();
  const people = db.select().from(users).all();
  const names = Object.fromEntries(people.map((u) => [u.id, u.name]));

  return (
    <div className="stack">
      <BackLink href="/committee" label="Back to committee" />
      <PageHeader
        title={meeting.title}
        description={`Meeting date ${meeting.meetingDate}`}
        actions={
          <>
            <ExportLinks basePath={`/api/export/meetings/${id}`} />
            <StatusBadge value={meeting.status} />
          </>
        }
      />
      <div className="panel panel-pad fade-in">
        <KeyValue label="Attendees">
          <div className="chip-row">
            {parseJsonArray(meeting.attendees).map((a) => (
              <span className="chip" key={a}>
                {a}
              </span>
            ))}
          </div>
        </KeyValue>
      </div>

      <div className="panel fade-in">
        <div className="panel-pad">
          <h2 style={{ margin: 0, fontFamily: "var(--font-display)" }}>Agenda</h2>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Item</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {agenda.map((a) => (
              <tr key={a.id}>
                <td>{a.sortOrder}</td>
                <td>{a.title}</td>
                <td>
                  {a.sourceType}
                  {a.isManual ? " (manual)" : " (auto)"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel fade-in">
        <div className="panel-pad">
          <h2 style={{ margin: 0, fontFamily: "var(--font-display)" }}>Decisions</h2>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Summary</th>
              <th>Rationale</th>
              <th>Approver</th>
            </tr>
          </thead>
          <tbody>
            {decs.map((d) => (
              <tr key={d.id}>
                <td>
                  {d.summary}
                  {d.conditions ? (
                    <div className="muted" style={{ fontSize: "0.85rem" }}>
                      Conditions: {d.conditions}
                    </div>
                  ) : null}
                  {parseJsonArray(d.linkedSystemIds).map((sid) => (
                    <div key={sid}>
                      <Link href={`/inventory/${sid}`}>Linked system</Link>
                    </div>
                  ))}
                </td>
                <td>{d.rationale}</td>
                <td>{d.approverId ? names[d.approverId] : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel fade-in">
        <div className="panel-pad">
          <h2 style={{ margin: 0, fontFamily: "var(--font-display)" }}>Action items</h2>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Action</th>
              <th>Owner</th>
              <th>Due</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {actions.map((a) => (
              <tr key={a.id}>
                <td>{a.title}</td>
                <td>{a.ownerId ? names[a.ownerId] : "—"}</td>
                <td>{a.dueAt ?? "—"}</td>
                <td>
                  <StatusBadge value={a.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {user && canCommittee(user.role) ? (
        <>
          <form action={addDecisionAction} className="panel panel-pad form-grid fade-in">
            <h2 style={{ margin: 0, fontFamily: "var(--font-display)" }}>Record decision</h2>
            <input type="hidden" name="meetingId" value={meeting.id} />
            <label>
              Summary
              <input name="summary" required />
            </label>
            <label>
              Rationale
              <textarea name="rationale" required />
            </label>
            <label>
              Conditions
              <input name="conditions" />
            </label>
            <label>
              Dissent noted
              <input name="dissent" />
            </label>
            <label>
              Linked system IDs (comma-separated)
              <input name="linkedSystemIds" />
            </label>
            <label>
              Spawn action item
              <input name="actionTitle" placeholder="Optional follow-up action" />
            </label>
            <label>
              Action owner
              <select name="actionOwnerId" defaultValue={user.id}>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Action due
              <input type="date" name="actionDueAt" />
            </label>
            <button className="btn btn-primary" type="submit">
              Save decision
            </button>
          </form>
          <form action={saveMeetingNotesAction} className="panel panel-pad form-grid fade-in">
            <h2 style={{ margin: 0, fontFamily: "var(--font-display)" }}>Meeting notes</h2>
            <input type="hidden" name="meetingId" value={meeting.id} />
            <label>
              Notes
              <textarea name="notes" defaultValue={meeting.notes ?? ""} />
            </label>
            <button className="btn btn-secondary" type="submit">
              Save notes & mark completed
            </button>
          </form>
        </>
      ) : null}
    </div>
  );
}
