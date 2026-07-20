import { redirect } from "next/navigation";
import { createSystemAction } from "@/app/actions/inventory";
import { BackLink, PageHeader } from "@/components/ui";
import { getCurrentUser, canWrite } from "@/lib/auth/session";
import { ensureDb } from "@/lib/db/ensure";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function NewInventoryPage() {
  ensureDb();
  const user = await getCurrentUser();
  if (!user || !canWrite(user.role)) redirect("/inventory");
  const owners = getDb().select().from(users).all();

  return (
    <div className="stack">
      <BackLink href="/inventory" label="Back to inventory" />
      <PageHeader
        title="Register AI system"
        description="Add an internally built or third-party AI system to the inventory."
      />
      <form action={createSystemAction} className="panel panel-pad form-grid fade-in">
        <label>
          Name
          <input name="name" required />
        </label>
        <label>
          Description
          <textarea name="description" required />
        </label>
        <label>
          Intended purpose
          <textarea name="intendedPurpose" required />
        </label>
        <label>
          Deployment context
          <input name="deploymentContext" />
        </label>
        <label>
          Vendor type
          <select name="vendorType" defaultValue="internal">
            <option value="internal">Internal</option>
            <option value="third_party">Third party</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </label>
        <label>
          Data categories (comma-separated)
          <input name="dataCategories" placeholder="customer_tickets, contact_info" />
        </label>
        <label>
          Model / vendor dependencies (comma-separated)
          <input name="modelDependencies" placeholder="OpenAI GPT-4o, Internal model" />
        </label>
        <label>
          Business owner
          <select name="businessOwnerId" defaultValue="">
            <option value="">—</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Technical owner
          <select name="technicalOwnerId" defaultValue="">
            <option value="">—</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Internal risk tier
          <select name="riskTier" defaultValue="">
            <option value="">Unset</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </label>
        <label>
          EU AI Act classification
          <select name="euClassification" defaultValue="">
            <option value="">Unset</option>
            <option value="prohibited">Prohibited</option>
            <option value="high_risk">High-risk</option>
            <option value="limited_risk">Limited risk</option>
            <option value="minimal_risk">Minimal risk</option>
          </select>
        </label>
        <button className="btn btn-primary" type="submit">
          Create record
        </button>
      </form>
    </div>
  );
}
