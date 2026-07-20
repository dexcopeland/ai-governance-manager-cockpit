import { getDb } from "@/lib/db";
import {
  actionItems,
  aiSystems,
  attestations,
  customMetrics,
  exceptions,
  intakeSubmissions,
} from "@/lib/db/schema";
import { parseJsonObject } from "@/lib/format";

export type MetricResult = {
  id: string;
  name: string;
  description: string | null;
  value: number;
  href: string;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function computeMetrics(): MetricResult[] {
  const db = getDb();
  const defs = db.select().from(customMetrics).all();
  const systems = db.select().from(aiSystems).all();
  const intakes = db.select().from(intakeSubmissions).all();
  const actions = db.select().from(actionItems).all();
  const excs = db.select().from(exceptions).all();
  const atts = db.select().from(attestations).all();
  const now = today();

  const builtins: MetricResult[] = [
    {
      id: "intake-pending",
      name: "Pending intakes",
      description: "Submitted or in-review use cases",
      value: intakes.filter((i) => i.status === "submitted" || i.status === "in_review")
        .length,
      href: "/intake",
    },
    {
      id: "tier-high",
      name: "High / critical systems",
      description: "Inventory risk distribution (top tiers)",
      value: systems.filter((s) => s.riskTier === "high" || s.riskTier === "critical")
        .length,
      href: "/inventory?tier=high",
    },
    {
      id: "overdue-reviews",
      name: "Overdue reviews",
      description: "Systems past next-review date",
      value: systems.filter(
        (s) =>
          s.nextReviewDate &&
          s.nextReviewDate < now &&
          s.lifecycleState !== "decommissioned",
      ).length,
      href: "/inventory",
    },
    {
      id: "expiring-exceptions",
      name: "Expiring exceptions (30d)",
      description: "Active exceptions nearing or past expiry",
      value: excs.filter((e) => {
        if (e.status !== "active") return false;
        const limit = new Date();
        limit.setDate(limit.getDate() + 30);
        return e.expiresAt <= limit.toISOString().slice(0, 10);
      }).length,
      href: "/exceptions",
    },
    {
      id: "actions-overdue",
      name: "Open actions past due",
      description: "Committee and regulatory follow-ups",
      value: actions.filter(
        (a) => a.status === "open" && a.dueAt && a.dueAt < now,
      ).length,
      href: "/committee",
    },
    {
      id: "attestation-rate",
      name: "Attestation completion %",
      description: "Completed vs assigned acknowledgements",
      value:
        atts.length === 0
          ? 100
          : Math.round(
              (atts.filter((a) => a.status === "completed").length / atts.length) *
                100,
            ),
      href: "/policies",
    },
  ];

  const custom = defs.map((def) => {
    const filter = parseJsonObject<{
      overdueReview?: boolean;
      overdueOpen?: boolean;
      tiers?: string[];
    }>(def.filterJson) ?? {};
    let value = 0;
    let href = "/executive";
    if (def.entity === "ai_systems") {
      href = "/inventory";
      let rows = systems;
      if (filter.overdueReview) {
        rows = rows.filter(
          (s) => s.nextReviewDate && s.nextReviewDate < now,
        );
      }
      if (filter.tiers?.length) {
        rows = rows.filter((s) => s.riskTier && filter.tiers!.includes(s.riskTier));
      }
      value = rows.length;
    } else if (def.entity === "action_items") {
      href = "/committee";
      let rows = actions;
      if (filter.overdueOpen) {
        rows = rows.filter(
          (a) => a.status === "open" && a.dueAt && a.dueAt < now,
        );
      }
      value = rows.length;
    } else {
      value = 0;
    }
    return {
      id: def.id,
      name: def.name,
      description: def.description,
      value,
      href,
    };
  });

  const seen = new Set(builtins.map((b) => b.name));
  return [...builtins, ...custom.filter((c) => !seen.has(c.name))];
}
