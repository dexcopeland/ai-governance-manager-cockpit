import { and, eq, lt, ne, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  actionItems,
  aiSystems,
  attestations,
  exceptions,
  intakeSubmissions,
  regulatoryItems,
} from "@/lib/db/schema";

export type TriageItem = {
  id: string;
  module: string;
  title: string;
  detail: string;
  urgency: "critical" | "high" | "medium" | "low";
  href: string;
  dueAt?: string | null;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getTriageItems(): TriageItem[] {
  const db = getDb();
  const items: TriageItem[] = [];
  const now = today();

  const intakes = db
    .select()
    .from(intakeSubmissions)
    .where(
      sql`${intakeSubmissions.status} IN ('submitted', 'in_review')`,
    )
    .all();
  for (const i of intakes) {
    const overdue = i.slaDueAt && i.slaDueAt < new Date().toISOString();
    items.push({
      id: `intake-${i.id}`,
      module: "Intake",
      title: i.title,
      detail: overdue ? "SLA breached — evaluation needed" : `Status: ${i.status}`,
      urgency: overdue ? "critical" : "high",
      href: `/intake/${i.id}`,
      dueAt: i.slaDueAt,
    });
  }

  const pendingReg = db
    .select()
    .from(regulatoryItems)
    .where(eq(regulatoryItems.status, "pending"))
    .all();
  for (const r of pendingReg) {
    items.push({
      id: `reg-${r.id}`,
      module: "Regulatory",
      title: r.title,
      detail: "Awaiting disposition",
      urgency: "high",
      href: `/regulatory/${r.id}`,
      dueAt: r.publishedAt,
    });
  }

  const overdueReviews = db
    .select()
    .from(aiSystems)
    .where(
      and(
        lt(aiSystems.nextReviewDate, now),
        ne(aiSystems.lifecycleState, "decommissioned"),
      ),
    )
    .all();
  for (const s of overdueReviews) {
    items.push({
      id: `review-${s.id}`,
      module: "Inventory",
      title: `${s.name} review overdue`,
      detail: `Next review was ${s.nextReviewDate}`,
      urgency: "critical",
      href: `/inventory/${s.id}`,
      dueAt: s.nextReviewDate,
    });
  }

  const expiring = db
    .select()
    .from(exceptions)
    .where(and(eq(exceptions.status, "active"), lt(exceptions.expiresAt, dayPlus(30))))
    .all();
  for (const e of expiring) {
    const expired = e.expiresAt < now;
    items.push({
      id: `exc-${e.id}`,
      module: "Exceptions",
      title: e.requirementSummary,
      detail: expired ? `Expired ${e.expiresAt}` : `Expires ${e.expiresAt}`,
      urgency: expired ? "critical" : "high",
      href: `/exceptions/${e.id}`,
      dueAt: e.expiresAt,
    });
  }

  const openActions = db
    .select()
    .from(actionItems)
    .where(eq(actionItems.status, "open"))
    .all();
  for (const a of openActions) {
    const overdue = a.dueAt && a.dueAt < now;
    items.push({
      id: `act-${a.id}`,
      module: "Actions",
      title: a.title,
      detail: overdue ? "Past due" : a.dueAt ? `Due ${a.dueAt}` : "Open",
      urgency: overdue ? "critical" : "medium",
      href: a.meetingId ? `/committee/${a.meetingId}` : "/committee",
      dueAt: a.dueAt,
    });
  }

  const pendingAtt = db
    .select()
    .from(attestations)
    .where(eq(attestations.status, "pending"))
    .all();
  for (const a of pendingAtt) {
    items.push({
      id: `att-${a.id}`,
      module: "Attestations",
      title: "Policy attestation pending",
      detail: a.dueAt ? `Due ${a.dueAt}` : "Acknowledgement outstanding",
      urgency: a.dueAt && a.dueAt < now ? "high" : "medium",
      href: "/self-service",
      dueAt: a.dueAt,
    });
  }

  const rank = { critical: 0, high: 1, medium: 2, low: 3 };
  return items.sort((a, b) => rank[a.urgency] - rank[b.urgency]);
}

function dayPlus(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
