"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getCurrentUser, canWrite } from "@/lib/auth/session";
import { recordAudit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { ensureDb } from "@/lib/db/ensure";
import {
  attestations,
  policies,
  policyFrameworkMaps,
  policyVersions,
} from "@/lib/db/schema";
import { FRAMEWORK_REFS } from "@/lib/frameworks/refs";
import { newId } from "@/lib/id";

export async function createPolicyAction(formData: FormData) {
  ensureDb();
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role)) throw new Error("Unauthorized");
  const db = getDb();
  const policyId = newId("pol");
  const versionId = newId("pv");
  const title = String(formData.get("title") || "").trim();
  const slug = String(formData.get("slug") || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-");
  const body = String(formData.get("body") || "").trim();
  if (!title || !slug || !body) throw new Error("Missing fields");

  const tiers = formData.getAll("tiers").map(String);
  const categories = String(formData.get("categories") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const refs = formData.getAll("frameworkRefs").map(String);

  db.insert(policies)
    .values({
      id: policyId,
      slug,
      title,
      ownerId: user.id,
      currentVersionId: versionId,
    })
    .run();
  db.insert(policyVersions)
    .values({
      id: versionId,
      policyId,
      version: 1,
      body,
      plainLanguageSummary: String(formData.get("plainLanguageSummary") || "").trim(),
      changeRationale: String(formData.get("changeRationale") || "Initial publication").trim(),
      applicableRiskTiers: JSON.stringify(tiers),
      applicableCategories: JSON.stringify(categories),
      applicableRoles: JSON.stringify(["submitter", "governance_manager"]),
      effectiveDate: String(formData.get("effectiveDate") || new Date().toISOString().slice(0, 10)),
      reviewDate: String(formData.get("reviewDate") || "") || null,
      createdById: user.id,
    })
    .run();

  for (const refKey of refs) {
    const [framework, referenceId] = refKey.split("::");
    const meta = FRAMEWORK_REFS.find(
      (r) => r.framework === framework && r.referenceId === referenceId,
    );
    if (!meta) continue;
    db.insert(policyFrameworkMaps)
      .values({
        id: newId("pfm"),
        policyVersionId: versionId,
        framework: meta.framework,
        referenceId: meta.referenceId,
        label: meta.label,
      })
      .run();
  }

  await recordAudit({
    entityType: "policy",
    entityId: policyId,
    action: "create",
    actorId: user.id,
    after: { title, slug, versionId },
  });
  revalidatePath("/policies");
  redirect(`/policies/${policyId}`);
}

export async function completeAttestationAction(formData: FormData) {
  ensureDb();
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  const id = String(formData.get("attestationId"));
  const db = getDb();
  const row = db.select().from(attestations).where(eq(attestations.id, id)).get();
  if (!row || row.userId !== user.id) throw new Error("Not your attestation");
  db.update(attestations)
    .set({ status: "completed", completedAt: new Date().toISOString() })
    .where(eq(attestations.id, id))
    .run();
  await recordAudit({
    entityType: "attestation",
    entityId: id,
    action: "complete",
    actorId: user.id,
  });
  revalidatePath("/self-service");
  revalidatePath("/triage");
}
