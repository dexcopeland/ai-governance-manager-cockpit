"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getCurrentUser, canWrite } from "@/lib/auth/session";
import { recordAudit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { ensureDb } from "@/lib/db/ensure";
import {
  actionItems,
  dispositions,
  regulatoryItems,
} from "@/lib/db/schema";
import { newId } from "@/lib/id";

export async function createManualRegulatoryItemAction(formData: FormData) {
  ensureDb();
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role)) throw new Error("Unauthorized");
  const id = newId("reg");
  const values = {
    id,
    sourceId: null,
    title: String(formData.get("title") || "").trim(),
    summary: String(formData.get("summary") || "").trim(),
    url: String(formData.get("url") || "").trim() || null,
    publishedAt: String(formData.get("publishedAt") || new Date().toISOString().slice(0, 10)),
    status: "pending",
  };
  getDb().insert(regulatoryItems).values(values).run();
  await recordAudit({
    entityType: "regulatory_item",
    entityId: id,
    action: "create_manual",
    actorId: user.id,
    after: values,
  });
  revalidatePath("/regulatory");
  revalidatePath("/triage");
}

export async function dispositionItemAction(formData: FormData) {
  ensureDb();
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role)) throw new Error("Unauthorized");
  const db = getDb();
  const itemId = String(formData.get("itemId"));
  const disposition = String(formData.get("disposition"));
  const notes = String(formData.get("notes") || "").trim();
  const linkedPolicyIds = String(formData.get("linkedPolicyIds") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const linkedSystemIds = String(formData.get("linkedSystemIds") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  let spawnedActionItemId: string | null = null;
  if (disposition === "action_required") {
    spawnedActionItemId = newId("act");
    db.insert(actionItems)
      .values({
        id: spawnedActionItemId,
        title: `Regulatory action: ${String(formData.get("actionTitle") || notes || itemId)}`,
        ownerId: user.id,
        dueAt: String(formData.get("actionDueAt") || "") || null,
        status: "open",
      })
      .run();
  }

  const dispId = newId("disp");
  db.insert(dispositions)
    .values({
      id: dispId,
      itemId,
      disposition,
      notes,
      decidedById: user.id,
      linkedPolicyIds: JSON.stringify(linkedPolicyIds),
      linkedSystemIds: JSON.stringify(linkedSystemIds),
      spawnedActionItemId,
    })
    .run();
  db.update(regulatoryItems)
    .set({ status: "dispositioned" })
    .where(eq(regulatoryItems.id, itemId))
    .run();

  await recordAudit({
    entityType: "disposition",
    entityId: dispId,
    action: "create",
    actorId: user.id,
    after: { itemId, disposition, notes },
  });
  revalidatePath("/regulatory");
  revalidatePath(`/regulatory/${itemId}`);
  revalidatePath("/triage");
}
