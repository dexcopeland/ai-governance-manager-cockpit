import { redirect } from "next/navigation";
import { createPolicyAction } from "@/app/actions/policies";
import { BackLink, PageHeader } from "@/components/ui";
import { getCurrentUser, canWrite } from "@/lib/auth/session";
import { FRAMEWORK_REFS } from "@/lib/frameworks/refs";
import { ensureDb } from "@/lib/db/ensure";

export const dynamic = "force-dynamic";

export default async function NewPolicyPage() {
  ensureDb();
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role)) redirect("/policies");

  return (
    <div className="stack">
      <BackLink href="/policies" label="Back to policies" />
      <PageHeader title="New policy" description="Create a versioned policy with structured framework mappings." />
      <form action={createPolicyAction} className="panel panel-pad form-grid fade-in">
        <label>
          Title
          <input name="title" required />
        </label>
        <label>
          Slug
          <input name="slug" required placeholder="ai-transparency" />
        </label>
        <label>
          Body
          <textarea name="body" required />
        </label>
        <label>
          Plain-language summary
          <textarea name="plainLanguageSummary" />
        </label>
        <label>
          Change rationale
          <input name="changeRationale" defaultValue="Initial publication" />
        </label>
        <fieldset style={{ border: "1px solid var(--line)", borderRadius: "0.45rem", padding: "0.75rem" }}>
          <legend>Applicable risk tiers</legend>
          {["low", "medium", "high", "critical"].map((t) => (
            <label key={t} style={{ display: "inline-flex", gap: "0.35rem", marginRight: "0.8rem", fontWeight: 500 }}>
              <input type="checkbox" name="tiers" value={t} /> {t}
            </label>
          ))}
        </fieldset>
        <label>
          Applicable categories (comma-separated)
          <input name="categories" placeholder="employment, customer_facing" />
        </label>
        <label>
          Effective date
          <input type="date" name="effectiveDate" defaultValue={new Date().toISOString().slice(0, 10)} />
        </label>
        <label>
          Review date
          <input type="date" name="reviewDate" />
        </label>
        <fieldset style={{ border: "1px solid var(--line)", borderRadius: "0.45rem", padding: "0.75rem", maxHeight: 240, overflow: "auto" }}>
          <legend>Framework mappings</legend>
          {FRAMEWORK_REFS.map((ref) => (
            <label key={`${ref.framework}-${ref.referenceId}`} style={{ display: "flex", gap: "0.45rem", fontWeight: 500, marginBottom: "0.35rem" }}>
              <input
                type="checkbox"
                name="frameworkRefs"
                value={`${ref.framework}::${ref.referenceId}`}
              />
              <span>
                <span className="muted">{ref.framework}</span> {ref.label}
              </span>
            </label>
          ))}
        </fieldset>
        <button className="btn btn-primary" type="submit">
          Publish policy
        </button>
      </form>
    </div>
  );
}
