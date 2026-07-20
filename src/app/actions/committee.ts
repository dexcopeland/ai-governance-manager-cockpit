"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getCurrentUser, canCommittee } from "@/lib/auth/session";
import { recordAudit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { ensureDb } from "@/lib/db/ensure";
import { actionItems, agendaItems, decisions, meetings } from "@/lib/db/schema";
import { newId } from "@/lib/id";
import { getTriageItems } from "@/lib/triage";

export async function createMeetingAction(formData: FormData) {
  ensureDb();
  const user = await getCurrentUser();
  if (!user || !canCommittee(user.role)) throw new Error("Unauthorized");
  const db = getDb();
  const id = newId("mtg");
  const title = String(formData.get("title") || "").trim();
  const meetingDate = String(formData.get("meetingDate") || "");
  const attendees = String(formData.get("attendees") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  db.insert(meetings)
    .values({
      id,
      title,
      meetingDate,
      attendees: JSON.stringify(attendees),
      notes: "",
      status: "scheduled",
      createdById: user.id,
    })
    .run();

  const auto = getTriageItems().filter((i) =>
    ["Intake", "Inventory", "Exceptions", "Regulatory", "Actions"].includes(i.module),
  );
  auto.slice(0, 12).forEach((item, index) => {
    db.insert(agendaItems)
      .values({
        id: newId("ag"),
        meetingId: id,
        title: item.title,
        sourceType: item.module.toLowerCase(),
        sourceId: item.id,
        sortOrder: index + 1,
        isManual: false,
      })
      .run();
  });

  const manual = String(formData.get("manualAgenda") || "").trim();
  if (manual) {
    db.insert(agendaItems)
      .values({
        id: newId("ag"),
        meetingId: id,
        title: manual,
        sourceType: "manual",
        sortOrder: 100,
        isManual: true,
      })
      .run();
  }

  await recordAudit({
    entityType: "meeting",
    entityId: id,
    action: "create",
    actorId: user.id,
    after: { title, meetingDate },
  });
  revalidatePath("/committee");
  redirect(`/committee/${id}`);
}

export async function addDecisionAction(formData: FormData) {
  ensureDb();
  const user = await getCurrentUser();
  if (!user || !canCommittee(user.role)) throw new Error("Unauthorized");
  const db = getDb();
  const meetingId = String(formData.get("meetingId"));
  const decisionId = newId("dec");
  db.insert(decisions)
    .values({
      id: decisionId,
      meetingId,
      summary: String(formData.get("summary") || "").trim(),
      rationale: String(formData.get("rationale") || "").trim(),
      conditions: String(formData.get("conditions") || "").trim() || null,
      dissent: String(formData.get("dissent") || "").trim() || null,
      approverId: user.id,
      linkedSystemIds: JSON.stringify(
        String(formData.get("linkedSystemIds") || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      ),
      linkedIntakeIds: JSON.stringify([]),
      linkedPolicyIds: JSON.stringify([]),
    })
    .run();

  const actionTitle = String(formData.get("actionTitle") || "").trim();
  if (actionTitle) {
    db.insert(actionItems)
      .values({
        id: newId("act"),
        meetingId,
        decisionId,
        title: actionTitle,
        ownerId: String(formData.get("actionOwnerId") || user.id),
        dueAt: String(formData.get("actionDueAt") || "") || null,
        status: "open",
      })
      .run();
  }

  await recordAudit({
    entityType: "decision",
    entityId: decisionId,
    action: "create",
    actorId: user.id,
  });
  revalidatePath(`/committee/${meetingId}`);
  revalidatePath("/triage");
}

export async function saveMeetingNotesAction(formData: FormData) {
  ensureDb();
  const user = await getCurrentUser();
  if (!user || !canCommittee(user.role)) throw new Error("Unauthorized");
  const meetingId = String(formData.get("meetingId"));
  const notes = String(formData.get("notes") || "");
  getDb()
    .update(meetings)
    .set({ notes, status: "completed" })
    .where(eq(meetings.id, meetingId))
    .run();
  await recordAudit({
    entityType: "meeting",
    entityId: meetingId,
    action: "update_notes",
    actorId: user.id,
  });
  revalidatePath(`/committee/${meetingId}`);
}
