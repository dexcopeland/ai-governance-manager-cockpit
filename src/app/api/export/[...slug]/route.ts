import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { ensureDb } from "@/lib/db/ensure";
import { getDb } from "@/lib/db";
import {
  actionItems,
  agendaItems,
  aiSystemLifecycleEvents,
  aiSystems,
  attestations,
  decisions,
  dispositions,
  evaluationGateAnswers,
  evaluationScores,
  exceptions,
  intakeSubmissions,
  meetings,
  policies,
  policyFrameworkMaps,
  policyVersions,
  regulatoryItems,
  regulatorySources,
} from "@/lib/db/schema";
import { csvDownloadResponse, jsonDownloadResponse, toCsv } from "@/lib/export";
import { computeMetrics } from "@/lib/metrics";

export const dynamic = "force-dynamic";

function asRows(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) {
    return data.map((row) =>
      typeof row === "object" && row !== null
        ? (row as Record<string, unknown>)
        : { value: row },
    );
  }
  if (typeof data === "object" && data !== null) {
    return [data as Record<string, unknown>];
  }
  return [{ value: data }];
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string[] }> },
) {
  ensureDb();
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { slug } = await context.params;
  const [entity, id] = slug;
  const format = request.nextUrl.searchParams.get("format") ?? "json";
  const db = getDb();

  let payload: unknown;
  let filename = `${entity || "export"}.json`;

  switch (entity) {
    case "inventory": {
      if (id) {
        const system = db.select().from(aiSystems).where(eq(aiSystems.id, id)).get();
        const events = db
          .select()
          .from(aiSystemLifecycleEvents)
          .where(eq(aiSystemLifecycleEvents.systemId, id))
          .all();
        payload = { system, events };
        filename = `inventory-${id}`;
      } else {
        payload = db.select().from(aiSystems).all();
        filename = "inventory";
      }
      break;
    }
    case "intake": {
      if (id) {
        payload = {
          intake: db
            .select()
            .from(intakeSubmissions)
            .where(eq(intakeSubmissions.id, id))
            .get(),
          scores: db
            .select()
            .from(evaluationScores)
            .where(eq(evaluationScores.intakeId, id))
            .all(),
          gates: db
            .select()
            .from(evaluationGateAnswers)
            .where(eq(evaluationGateAnswers.intakeId, id))
            .all(),
        };
        filename = `intake-${id}`;
      } else {
        payload = db.select().from(intakeSubmissions).all();
        filename = "intake";
      }
      break;
    }
    case "policies": {
      if (id) {
        const policy = db.select().from(policies).where(eq(policies.id, id)).get();
        const versions = db
          .select()
          .from(policyVersions)
          .where(eq(policyVersions.policyId, id))
          .all();
        const maps = versions.flatMap((v) =>
          db
            .select()
            .from(policyFrameworkMaps)
            .where(eq(policyFrameworkMaps.policyVersionId, v.id))
            .all(),
        );
        const atts = versions.flatMap((v) =>
          db
            .select()
            .from(attestations)
            .where(eq(attestations.policyVersionId, v.id))
            .all(),
        );
        payload = { policy, versions, maps, attestations: atts };
        filename = `policy-${id}`;
      } else {
        payload = db.select().from(policies).all();
        filename = "policies";
      }
      break;
    }
    case "exceptions": {
      payload = id
        ? db.select().from(exceptions).where(eq(exceptions.id, id)).get()
        : db.select().from(exceptions).all();
      filename = id ? `exception-${id}` : "exceptions";
      break;
    }
    case "meetings": {
      if (id) {
        payload = {
          meeting: db.select().from(meetings).where(eq(meetings.id, id)).get(),
          agenda: db
            .select()
            .from(agendaItems)
            .where(eq(agendaItems.meetingId, id))
            .all(),
          decisions: db
            .select()
            .from(decisions)
            .where(eq(decisions.meetingId, id))
            .all(),
          actionItems: db
            .select()
            .from(actionItems)
            .where(eq(actionItems.meetingId, id))
            .all(),
        };
        filename = `meeting-${id}`;
      } else {
        payload = {
          meetings: db.select().from(meetings).all(),
          decisions: db.select().from(decisions).all(),
        };
        filename = "meetings";
      }
      break;
    }
    case "regulatory": {
      if (id) {
        payload = {
          item: db
            .select()
            .from(regulatoryItems)
            .where(eq(regulatoryItems.id, id))
            .get(),
          dispositions: db
            .select()
            .from(dispositions)
            .where(eq(dispositions.itemId, id))
            .all(),
        };
        filename = `regulatory-${id}`;
      } else {
        payload = {
          sources: db.select().from(regulatorySources).all(),
          items: db.select().from(regulatoryItems).all(),
          dispositions: db.select().from(dispositions).all(),
        };
        filename = "regulatory";
      }
      break;
    }
    case "executive": {
      payload = {
        generatedAt: new Date().toISOString(),
        metrics: computeMetrics(),
        inventory: db.select().from(aiSystems).all(),
        intakes: db.select().from(intakeSubmissions).all(),
      };
      filename = "executive-snapshot";
      break;
    }
    default:
      return new Response("Unknown export entity", { status: 404 });
  }

  if (format === "csv") {
    const rows = asRows(
      Array.isArray(payload)
        ? payload
        : payload && typeof payload === "object" && "system" in (payload as object)
          ? [(payload as { system: unknown }).system]
          : payload && typeof payload === "object" && "intake" in (payload as object)
            ? [(payload as { intake: unknown }).intake]
            : payload && typeof payload === "object" && "policy" in (payload as object)
              ? [(payload as { policy: unknown }).policy]
              : payload && typeof payload === "object" && "meeting" in (payload as object)
                ? [(payload as { meeting: unknown }).meeting]
                : payload && typeof payload === "object" && "item" in (payload as object)
                  ? [(payload as { item: unknown }).item]
                  : payload && typeof payload === "object" && "metrics" in (payload as object)
                    ? (payload as { metrics: unknown[] }).metrics
                    : payload && typeof payload === "object" && "meetings" in (payload as object)
                      ? (payload as { meetings: unknown[] }).meetings
                      : payload && typeof payload === "object" && "items" in (payload as object)
                        ? (payload as { items: unknown[] }).items
                        : [payload],
    );
    return csvDownloadResponse(toCsv(rows), `${filename}.csv`);
  }

  return jsonDownloadResponse(payload, `${filename}.json`);
}
