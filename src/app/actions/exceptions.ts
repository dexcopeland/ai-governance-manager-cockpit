"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getCurrentUser, canWrite } from "@/lib/auth/session";
import { recordAudit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { ensureDb } from "@/lib/db/ensure";
import { exceptions } from "@/lib/db/schema";
import { newId } from "@/lib/id";

export async function createExceptionAction(formData: FormData) {
  ensureDb();
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role)) throw new Error("Unauthorized");
  const expiresAt = String(formData.get("expiresAt") || "");
  if (!expiresAt) throw new Error("Expiry date is mandatory");
  const id = newId("exc");
  const values = {
    id,
    version: 1,
    systemId: String(formData.get("systemId")),
    policyId: String(formData.get("policyId")),
    requirementSummary: String(formData.get("requirementSummary") || "").trim(),
    rationale: String(formData.get("rationale") || "").trim(),
    compensatingControls: String(formData.get("compensatingControls") || "").trim(),
    riskAcceptorId: String(formData.get("riskAcceptorId")),
    status: "active",
    expiresAt,
    createdById: user.id,
  };
  getDb().insert(exceptions).values(values).run();
  await recordAudit({
    entityType: "exception",
    entityId: id,
    action: "create",
    actorId: user.id,
    after: values,
  });
  revalidatePath("/exceptions");
  revalidatePath("/triage");
  redirect(`/exceptions/${id}`);
}

export async function renewExceptionAction(formData: FormData) {
  ensureDb();
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role)) throw new Error("Unauthorized");
  const db = getDb();
  const parentId = String(formData.get("exceptionId"));
  const parent = db.select().from(exceptions).where(eq(exceptions.id, parentId)).get();
  if (!parent) throw new Error("Not found");
  const expiresAt = String(formData.get("expiresAt") || "");
  if (!expiresAt) throw new Error("Expiry required");
  db.update(exceptions)
    .set({ status: "superseded", updatedAt: new Date().toISOString() })
    .where(eq(exceptions.id, parentId))
    .run();
  const id = newId("exc");
  const values = {
    id,
    parentId: parent.parentId ?? parent.id,
    version: parent.version + 1,
    systemId: parent.systemId,
    policyId: parent.policyId,
    requirementSummary: parent.requirementSummary,
    rationale: String(formData.get("rationale") || parent.rationale).trim(),
    compensatingControls: String(
      formData.get("compensatingControls") || parent.compensatingControls,
    ).trim(),
    riskAcceptorId: String(formData.get("riskAcceptorId") || parent.riskAcceptorId),
    status: "active",
    expiresAt,
    createdById: user.id,
  };
  db.insert(exceptions).values(values).run();
  await recordAudit({
    entityType: "exception",
    entityId: id,
    action: "renew",
    actorId: user.id,
    before: parent,
    after: values,
  });
  revalidatePath("/exceptions");
  revalidatePath("/triage");
  redirect(`/exceptions/${id}`);
}
