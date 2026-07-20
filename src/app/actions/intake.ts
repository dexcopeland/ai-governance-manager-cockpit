"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { addDays } from "date-fns";
import { getCurrentUser, canSubmit, canWrite } from "@/lib/auth/session";
import { recordAudit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { ensureDb } from "@/lib/db/ensure";
import {
  aiSystemLifecycleEvents,
  aiSystems,
  evaluationGateAnswers,
  evaluationScores,
  hardGates,
  intakeSubmissions,
  riskFactors,
  riskMethodologyVersions,
  RiskTier,
  tierObligations,
} from "@/lib/db/schema";
import { newId } from "@/lib/id";
import { computeComposite, maxTier, reviewDateForTier, scoreToTier } from "@/lib/scoring";

export async function submitIntakeAction(formData: FormData) {
  ensureDb();
  const user = await getCurrentUser();
  if (!user || !canSubmit(user.role)) throw new Error("Unauthorized");
  const db = getDb();
  const method = db
    .select()
    .from(riskMethodologyVersions)
    .where(eq(riskMethodologyVersions.isActive, true))
    .get();
  const id = newId("int");
  const values = {
    id,
    title: String(formData.get("title") || "").trim(),
    purpose: String(formData.get("purpose") || "").trim(),
    dataInvolved: String(formData.get("dataInvolved") || "").trim(),
    affectedPopulations: String(formData.get("affectedPopulations") || "").trim(),
    vendorModelDetails: String(formData.get("vendorModelDetails") || "").trim(),
    useCaseCategory: String(formData.get("useCaseCategory") || "").trim(),
    status: "submitted" as const,
    submitterId: user.id,
    methodologyVersionId: method?.id ?? null,
    slaDueAt: addDays(new Date(), 5).toISOString(),
  };
  if (!values.title || !values.purpose) throw new Error("Title and purpose required");
  db.insert(intakeSubmissions).values(values).run();
  await recordAudit({
    entityType: "intake",
    entityId: id,
    action: "submit",
    actorId: user.id,
    after: values,
  });
  revalidatePath("/intake");
  revalidatePath("/triage");
  revalidatePath("/self-service");
  redirect(`/intake/${id}`);
}

export async function evaluateIntakeAction(formData: FormData) {
  ensureDb();
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role)) throw new Error("Unauthorized");
  const db = getDb();
  const intakeId = String(formData.get("intakeId"));
  const intake = db
    .select()
    .from(intakeSubmissions)
    .where(eq(intakeSubmissions.id, intakeId))
    .get();
  if (!intake) throw new Error("Intake not found");
  const methodId = intake.methodologyVersionId;
  if (!methodId) throw new Error("No methodology version on intake");

  const factors = db
    .select()
    .from(riskFactors)
    .where(eq(riskFactors.methodologyVersionId, methodId))
    .all();
  const gates = db
    .select()
    .from(hardGates)
    .where(eq(hardGates.methodologyVersionId, methodId))
    .all();

  db.delete(evaluationScores).where(eq(evaluationScores.intakeId, intakeId)).run();
  db.delete(evaluationGateAnswers)
    .where(eq(evaluationGateAnswers.intakeId, intakeId))
    .run();

  const scored: Array<{ score: number; weight: number }> = [];
  for (const factor of factors) {
    const score = Number(formData.get(`factor_${factor.id}`));
    const rationale = String(formData.get(`factor_rationale_${factor.id}`) || "").trim();
    if (!score || score < 1 || score > 5 || !rationale) {
      throw new Error(`Factor ${factor.label} requires score 1-5 and rationale`);
    }
    db.insert(evaluationScores)
      .values({
        id: newId("scr"),
        intakeId,
        factorId: factor.id,
        score,
        rationale,
      })
      .run();
    scored.push({ score, weight: factor.weight });
  }

  let blocked = false;
  let forced: RiskTier | null = null;
  const triggeredKeys: string[] = [];
  for (const gate of gates) {
    const triggered = formData.get(`gate_${gate.id}`) === "on";
    const rationale = String(formData.get(`gate_rationale_${gate.id}`) || "").trim();
    if (!rationale) throw new Error(`Gate ${gate.label} requires rationale`);
    db.insert(evaluationGateAnswers)
      .values({
        id: newId("ega"),
        intakeId,
        gateId: gate.id,
        triggered,
        rationale,
      })
      .run();
    if (triggered) {
      triggeredKeys.push(gate.key);
      if (gate.blocksApproval) blocked = true;
      if (gate.forcedTier) {
        forced = forced ? maxTier(forced, gate.forcedTier) : gate.forcedTier;
      }
    }
  }

  const composite = computeComposite(scored);
  let tier = scoreToTier(composite);
  if (forced) tier = maxTier(tier, forced);

  const obligation = db
    .select()
    .from(tierObligations)
    .where(
      and(
        eq(tierObligations.methodologyVersionId, methodId),
        eq(tierObligations.tier, tier),
      ),
    )
    .get();

  const obligationSnapshot = obligation
    ? {
        tier,
        requiredArtifacts: JSON.parse(obligation.requiredArtifacts),
        requiredApprovals: JSON.parse(obligation.requiredApprovals),
        reviewCadenceDays: obligation.reviewCadenceDays,
        blocked,
      }
    : { tier, blocked };

  db.update(intakeSubmissions)
    .set({
      status: blocked ? "evaluated" : "evaluated",
      compositeScore: composite,
      resultingTier: tier,
      gateTriggered: triggeredKeys.join(",") || null,
      obligationSnapshot: JSON.stringify(obligationSnapshot),
      evaluationRationale: String(formData.get("evaluationRationale") || "").trim(),
      evaluatedAt: new Date().toISOString(),
      evaluatedById: user.id,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(intakeSubmissions.id, intakeId))
    .run();

  await recordAudit({
    entityType: "intake",
    entityId: intakeId,
    action: "evaluate",
    actorId: user.id,
    after: { composite, tier, blocked, triggeredKeys, methodologyVersionId: methodId },
  });
  revalidatePath(`/intake/${intakeId}`);
  revalidatePath("/triage");
}

export async function approveIntakeAction(formData: FormData) {
  ensureDb();
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role)) throw new Error("Unauthorized");
  const db = getDb();
  const intakeId = String(formData.get("intakeId"));
  const intake = db
    .select()
    .from(intakeSubmissions)
    .where(eq(intakeSubmissions.id, intakeId))
    .get();
  if (!intake || !intake.resultingTier) throw new Error("Evaluate before approving");
  if (intake.obligationSnapshot) {
    const snap = JSON.parse(intake.obligationSnapshot) as { blocked?: boolean };
    if (snap.blocked) throw new Error("Hard gate blocks approval");
  }

  let systemId = intake.linkedSystemId;
  if (!systemId) {
    systemId = newId("sys");
    db.insert(aiSystems)
      .values({
        id: systemId,
        name: intake.title,
        description: intake.purpose,
        intendedPurpose: intake.purpose,
        businessOwnerId: intake.submitterId,
        lifecycleState: "approved",
        deploymentContext: intake.vendorModelDetails,
        dataCategories: JSON.stringify(
          intake.dataInvolved.split(",").map((s) => s.trim()).filter(Boolean),
        ),
        modelDependencies: JSON.stringify([intake.vendorModelDetails]),
        vendorType: "hybrid",
        riskTier: intake.resultingTier,
        euClassification:
          intake.resultingTier === "high" || intake.resultingTier === "critical"
            ? "high_risk"
            : "limited_risk",
        nextReviewDate: reviewDateForTier(intake.resultingTier),
        intakeId,
        createdById: user.id,
      })
      .run();
    db.insert(aiSystemLifecycleEvents)
      .values({
        id: newId("lce"),
        systemId,
        fromState: null,
        toState: "approved",
        reason: "Created from approved intake",
        changedById: user.id,
      })
      .run();
  }

  db.update(intakeSubmissions)
    .set({
      status: "approved",
      linkedSystemId: systemId,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(intakeSubmissions.id, intakeId))
    .run();

  await recordAudit({
    entityType: "intake",
    entityId: intakeId,
    action: "approve",
    actorId: user.id,
    after: { linkedSystemId: systemId },
  });
  revalidatePath(`/intake/${intakeId}`);
  revalidatePath("/inventory");
  revalidatePath("/triage");
  redirect(`/inventory/${systemId}`);
}
