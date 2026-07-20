import { redirect } from "next/navigation";
import { submitIntakeAction } from "@/app/actions/intake";
import { BackLink, PageHeader } from "@/components/ui";
import { getCurrentUser, canSubmit } from "@/lib/auth/session";
import { ensureDb } from "@/lib/db/ensure";

export const dynamic = "force-dynamic";

export default async function NewIntakePage() {
  ensureDb();
  const user = await getCurrentUser();
  if (!user || !canSubmit(user.role)) redirect("/intake");

  return (
    <div className="stack">
      <BackLink href="/intake" label="Back to intake queue" />
      <PageHeader
        title="Submit AI use case"
        description="Business-unit intake form. Governance will evaluate risk factors and hard gates."
      />
      <form action={submitIntakeAction} className="panel panel-pad form-grid fade-in">
        <label>
          Use case title
          <input name="title" required />
        </label>
        <label>
          Purpose
          <textarea name="purpose" required />
        </label>
        <label>
          Data involved
          <textarea name="dataInvolved" required />
        </label>
        <label>
          Affected populations
          <textarea name="affectedPopulations" required />
        </label>
        <label>
          Vendor / model details
          <textarea name="vendorModelDetails" required />
        </label>
        <label>
          Use-case category
          <select name="useCaseCategory" defaultValue="operations">
            <option value="operations">Operations</option>
            <option value="customer_facing">Customer facing</option>
            <option value="employment">Employment</option>
            <option value="marketing">Marketing</option>
            <option value="credit">Credit</option>
            <option value="insurance">Insurance</option>
          </select>
        </label>
        <button className="btn btn-primary" type="submit">
          Submit for review
        </button>
      </form>
    </div>
  );
}
