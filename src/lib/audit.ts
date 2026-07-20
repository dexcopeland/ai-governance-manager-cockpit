import { getDb } from "@/lib/db";
import { auditEvents } from "@/lib/db/schema";
import { newId } from "@/lib/id";

export async function recordAudit(input: {
  entityType: string;
  entityId: string;
  action: string;
  actorId?: string | null;
  before?: unknown;
  after?: unknown;
}) {
  const db = getDb();
  db.insert(auditEvents)
    .values({
      id: newId("aud"),
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      actorId: input.actorId ?? null,
      beforeJson: input.before ? JSON.stringify(input.before) : null,
      afterJson: input.after ? JSON.stringify(input.after) : null,
    })
    .run();
}
