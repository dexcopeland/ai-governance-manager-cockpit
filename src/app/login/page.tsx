import { ensureDb } from "@/lib/db/ensure";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { loginAsUser } from "@/app/actions/auth";
import { labelize } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  ensureDb();
  const db = getDb();
  const allUsers = db.select().from(users).all();

  return (
    <div className="login-wrap">
      <div className="panel login-panel">
        <div className="brand" style={{ color: "var(--ink)" }}>
          AI Governance Cockpit
          <span style={{ color: "var(--muted)" }}>Demo personas — no password</span>
        </div>
        <p className="muted" style={{ marginTop: "1rem" }}>
          Pick a role to explore the cockpit. Seeded data covers inventory, intake,
          policies, exceptions, committee decisions, and regulatory triage.
        </p>
        <div className="persona-grid">
          {allUsers.map((user) => (
            <form
              key={user.id}
              action={async () => {
                "use server";
                await loginAsUser(user.id);
              }}
            >
              <button className="persona" type="submit">
                <strong>{user.name}</strong>
                <span className="muted">
                  {labelize(user.role)}
                  {user.businessUnit ? ` · ${user.businessUnit}` : ""}
                </span>
              </button>
            </form>
          ))}
        </div>
      </div>
    </div>
  );
}
