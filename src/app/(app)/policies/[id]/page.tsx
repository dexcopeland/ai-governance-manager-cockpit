import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import {
  BackLink,
  ExportLinks,
  KeyValue,
  PageHeader,
  StatusBadge,
} from "@/components/ui";
import { ensureDb } from "@/lib/db/ensure";
import { getDb } from "@/lib/db";
import {
  attestations,
  policies,
  policyFrameworkMaps,
  policyVersions,
  users,
} from "@/lib/db/schema";
import { parseJsonArray } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PolicyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  ensureDb();
  const { id } = await params;
  const db = getDb();
  const policy = db.select().from(policies).where(eq(policies.id, id)).get();
  if (!policy) notFound();
  const versions = db
    .select()
    .from(policyVersions)
    .where(eq(policyVersions.policyId, id))
    .orderBy(desc(policyVersions.version))
    .all();
  const current =
    versions.find((v) => v.id === policy.currentVersionId) ?? versions[0];
  const maps = current
    ? db
        .select()
        .from(policyFrameworkMaps)
        .where(eq(policyFrameworkMaps.policyVersionId, current.id))
        .all()
    : [];
  const atts = current
    ? db
        .select()
        .from(attestations)
        .where(eq(attestations.policyVersionId, current.id))
        .all()
    : [];
  const names = Object.fromEntries(db.select().from(users).all().map((u) => [u.id, u.name]));

  return (
    <div className="stack">
      <BackLink href="/policies" label="Back to policies" />
      <PageHeader
        title={policy.title}
        description={current?.plainLanguageSummary || "Versioned governance policy"}
        actions={<ExportLinks basePath={`/api/export/policies/${id}`} />}
      />
      <div className="panel panel-pad stack fade-in">
        <KeyValue label="Body">
          <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{current?.body}</p>
        </KeyValue>
        <KeyValue label="Applicable tiers">
          <div className="chip-row">
            {parseJsonArray(current?.applicableRiskTiers).map((t) => (
              <span className="chip" key={t}>
                {t}
              </span>
            ))}
          </div>
        </KeyValue>
        <KeyValue label="Applicable categories">
          <div className="chip-row">
            {parseJsonArray(current?.applicableCategories).map((t) => (
              <span className="chip" key={t}>
                {t}
              </span>
            ))}
          </div>
        </KeyValue>
        <KeyValue label="Framework mappings">
          <div className="stack" style={{ gap: "0.35rem" }}>
            {maps.map((m) => (
              <div key={m.id}>
                <Link
                  href={`/policies?framework=${m.framework}&ref=${encodeURIComponent(m.referenceId)}`}
                >
                  {m.framework} · {m.label}
                </Link>
              </div>
            ))}
          </div>
        </KeyValue>
        <KeyValue label="Effective / review">
          {current?.effectiveDate ?? "—"} / {current?.reviewDate ?? "—"}
        </KeyValue>
        <KeyValue label="Change rationale">{current?.changeRationale ?? "—"}</KeyValue>
      </div>

      <div className="panel fade-in">
        <div className="panel-pad">
          <h2 style={{ margin: 0, fontFamily: "var(--font-display)" }}>Attestations</h2>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Person</th>
              <th>Status</th>
              <th>Due</th>
              <th>Completed</th>
            </tr>
          </thead>
          <tbody>
            {atts.map((a) => (
              <tr key={a.id}>
                <td>{names[a.userId] ?? a.userId}</td>
                <td>
                  <StatusBadge value={a.status} />
                </td>
                <td>{a.dueAt ?? "—"}</td>
                <td>{a.completedAt?.slice(0, 10) ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel fade-in">
        <div className="panel-pad">
          <h2 style={{ margin: 0, fontFamily: "var(--font-display)" }}>Version history</h2>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Version</th>
              <th>Effective</th>
              <th>Rationale</th>
            </tr>
          </thead>
          <tbody>
            {versions.map((v) => (
              <tr key={v.id}>
                <td>v{v.version}</td>
                <td>{v.effectiveDate}</td>
                <td>{v.changeRationale}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
