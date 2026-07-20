"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getCurrentUser, canWrite } from "@/lib/auth/session";
import { recordAudit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { ensureDb } from "@/lib/db/ensure";
import {
  aiSystemLifecycleEvents,
  aiSystems,
  LifecycleState,
  lifecycleStates,
  RiskTier,
  EuClassification,
} from "@/lib/db/schema";
import { newId } from "@/lib/id";
import { reviewDateForTier } from "@/lib/scoring";

function requireWriter() {
  return getCurrentUser().then((user) => {
    if (!user || !canWrite(user.role)) {
      throw new Error("Unauthorized");
    }
    return user;
  });
}

export async function createSystemAction(formData: FormData) {
  ensureDb();
  const user = await requireWriter();
  const db = getDb();
  const id = newId("sys");
  const riskTier = String(formData.get("riskTier") || "") as RiskTier | "";
  const values = {
    id,
    name: String(formData.get("name") || "").trim(),
    description: String(formData.get("description") || "").trim(),
    intendedPurpose: String(formData.get("intendedPurpose") || "").trim(),
    businessOwnerId: String(formData.get("businessOwnerId") || "") || null,
    technicalOwnerId: String(formData.get("technicalOwnerId") || "") || null,
    lifecycleState: "proposed" as LifecycleState,
    deploymentContext: String(formData.get("deploymentContext") || "").trim(),
    dataCategories: JSON.stringify(
      String(formData.get("dataCategories") || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
    modelDependencies: JSON.stringify(
      String(formData.get("modelDependencies") || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
    vendorType: String(formData.get("vendorType") || "internal"),
    riskTier: riskTier || null,
    euClassification:
      (String(formData.get("euClassification") || "") as EuClassification) ||
      null,
    nextReviewDate: riskTier ? reviewDateForTier(riskTier) : null,
    createdById: user.id,
  };
  if (!values.name || !values.description || !values.intendedPurpose) {
    throw new Error("Name, description, and intended purpose are required");
  }
  db.insert(aiSystems).values(values).run();
  db.insert(aiSystemLifecycleEvents)
    .values({
      id: newId("lce"),
      systemId: id,
      fromState: null,
      toState: "proposed",
      reason: "System registered",
      changedById: user.id,
    })
    .run();
  await recordAudit({
    entityType: "ai_system",
    entityId: id,
    action: "create",
    actorId: user.id,
    after: values,
  });
  revalidatePath("/inventory");
  redirect(`/inventory/${id}`);
}

export async function transitionLifecycleAction(formData: FormData) {
  ensureDb();
  const user = await requireWriter();
  const db = getDb();
  const systemId = String(formData.get("systemId"));
  const toState = String(formData.get("toState")) as LifecycleState;
  const reason = String(formData.get("reason") || "").trim();
  if (!lifecycleStates.includes(toState) || !reason) {
    throw new Error("Invalid transition");
  }
  const current = db.select().from(aiSystems).where(eq(aiSystems.id, systemId)).get();
  if (!current) throw new Error("System not found");
  db.update(aiSystems)
    .set({
      lifecycleState: toState,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(aiSystems.id, systemId))
    .run();
  db.insert(aiSystemLifecycleEvents)
    .values({
      id: newId("lce"),
      systemId,
      fromState: current.lifecycleState,
      toState,
      reason,
      changedById: user.id,
    })
    .run();
  await recordAudit({
    entityType: "ai_system",
    entityId: systemId,
    action: "lifecycle_transition",
    actorId: user.id,
    before: { lifecycleState: current.lifecycleState },
    after: { lifecycleState: toState, reason },
  });
  revalidatePath(`/inventory/${systemId}`);
  revalidatePath("/triage");
}

export async function updateReviewDateAction(formData: FormData) {
  ensureDb();
  const user = await requireWriter();
  const db = getDb();
  const systemId = String(formData.get("systemId"));
  const nextReviewDate = String(formData.get("nextReviewDate") || "");
  const current = db.select().from(aiSystems).where(eq(aiSystems.id, systemId)).get();
  db.update(aiSystems)
    .set({ nextReviewDate, updatedAt: new Date().toISOString() })
    .where(eq(aiSystems.id, systemId))
    .run();
  await recordAudit({
    entityType: "ai_system",
    entityId: systemId,
    action: "update_review_date",
    actorId: user.id,
    before: { nextReviewDate: current?.nextReviewDate },
    after: { nextReviewDate },
  });
  revalidatePath(`/inventory/${systemId}`);
  revalidatePath("/triage");
}
