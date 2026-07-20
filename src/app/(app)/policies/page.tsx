import Link from "next/link";
import { eq } from "drizzle-orm";
import { ExportLinks, PageHeader } from "@/components/ui";
import { getCurrentUser, canWrite } from "@/lib/auth/session";
import { ensureDb } from "@/lib/db/ensure";
import { getDb } from "@/lib/db";
import { policies, policyFrameworkMaps, policyVersions } from "@/lib/db/schema";
import { parseJsonArray } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PoliciesPage({
  searchParams,
}: {
  searchParams: Promise<{ framework?: string; ref?: string }>;
}) {
  ensureDb();
  const user = await getCurrentUser();
  const params = await searchParams;
  const db = getDb();
  let rows = db.select().from(policies).all();

  if (params.framework && params.ref) {
    const maps = db
      .select()
      .from(policyFrameworkMaps)
      .all()
      .filter(
        (m) => m.framework === params.framework && m.referenceId === params.ref,
      );
    const versionIds = new Set(maps.map((m) => m.policyVersionId));
    const versions = db
      .select()
      .from(policyVersions)
      .all()
      .filter((v) => versionIds.has(v.id));
    const policyIds = new Set(versions.map((v) => v.policyId));
    rows = rows.filter((p) => policyIds.has(p.id));
  }

  const versions = Object.fromEntries(
    db
      .select()
      .from(policyVersions)
      .all()
      .map((v) => [v.id, v]),
  );

  return (
    <div className="stack">
      <PageHeader
        title="Policy Library"
        description="Applicability engine with framework mappings — not a file cabinet."
        actions={
          <>
            <ExportLinks basePath="/api/export/policies" />
            {user && canWrite(user.role) ? (
              <Link className="btn btn-primary" href="/policies/new">
                New policy
              </Link>
            ) : null}
          </>
        }
      />
      <form className="panel panel-pad fade-in" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <select name="framework" defaultValue={params.framework ?? ""} style={{ padding: "0.5rem", border: "1px solid var(--line)", borderRadius: "0.4rem" }}>
          <option value="">Framework…</option>
          <option value="NIST_AI_RMF">NIST AI RMF</option>
          <option value="EU_AI_ACT">EU AI Act</option>
          <option value="ISO_42001">ISO/IEC 42001</option>
        </select>
        <input
          name="ref"
          placeholder="Reference ID e.g. A.6.1.2"
          defaultValue={params.ref}
          style={{ flex: 1, minWidth: 180, padding: "0.5rem 0.7rem", border: "1px solid var(--line)", borderRadius: "0.4rem" }}
        />
        <button className="btn btn-secondary" type="submit">
          Reverse query
        </button>
        {(params.framework || params.ref) && (
          <Link className="btn btn-secondary" href="/policies">
            Clear
          </Link>
        )}
      </form>
      <div className="panel fade-in">
        <table className="table">
          <thead>
            <tr>
              <th>Policy</th>
              <th>Tiers</th>
              <th>Effective</th>
              <th>Version</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const version = row.currentVersionId
                ? versions[row.currentVersionId]
                : db
                    .select()
                    .from(policyVersions)
                    .where(eq(policyVersions.policyId, row.id))
                    .get();
              return (
                <tr key={row.id}>
                  <td>
                    <Link href={`/policies/${row.id}`} style={{ fontWeight: 600 }}>
                      {row.title}
                    </Link>
                    <div className="muted" style={{ fontSize: "0.85rem" }}>
                      {row.slug}
                    </div>
                  </td>
                  <td>
                    <div className="chip-row">
                      {parseJsonArray(version?.applicableRiskTiers).map((t) => (
                        <span className="chip" key={t}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>{version?.effectiveDate ?? "—"}</td>
                  <td>v{version?.version ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
