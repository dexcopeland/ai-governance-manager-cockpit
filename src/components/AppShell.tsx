import Link from "next/link";
import { ReactNode } from "react";
import { Role } from "@/lib/db/schema";
import { logoutAction } from "@/app/actions/auth";

const NAV: Array<{ href: string; label: string; roles?: Role[] }> = [
  { href: "/triage", label: "Triage Inbox" },
  { href: "/inventory", label: "AI Inventory" },
  { href: "/intake", label: "Intake & Risk" },
  { href: "/policies", label: "Policy Library" },
  { href: "/exceptions", label: "Exceptions" },
  { href: "/committee", label: "Committee" },
  { href: "/regulatory", label: "Regulatory Watch" },
  { href: "/executive", label: "Executive", roles: ["admin", "governance_manager", "executive", "auditor"] },
  { href: "/self-service", label: "Self-Service", roles: ["admin", "governance_manager", "submitter"] },
  { href: "/admin/methodology", label: "Methodology", roles: ["admin", "governance_manager"] },
];

export function AppShell({
  children,
  user,
  pathname,
}: {
  children: ReactNode;
  user: { name: string; role: Role; email: string };
  pathname: string;
}) {
  const links = NAV.filter(
    (item) => !item.roles || item.roles.includes(user.role),
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          AI Governance Cockpit
          <span>Operational control for AI programs</span>
        </div>
        <nav style={{ display: "grid", gap: "0.2rem", flex: 1 }}>
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="nav-link"
              data-active={
                pathname === item.href || pathname.startsWith(`${item.href}/`)
                  ? "true"
                  : "false"
              }
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div style={{ fontSize: "0.85rem", opacity: 0.9 }}>
          <div style={{ fontWeight: 600 }}>{user.name}</div>
          <div style={{ opacity: 0.75, marginBottom: "0.75rem" }}>
            {user.role.replace(/_/g, " ")}
          </div>
          <form action={logoutAction}>
            <button className="btn btn-secondary" type="submit" style={{ width: "100%", color: "#102a2b" }}>
              Switch persona
            </button>
          </form>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
