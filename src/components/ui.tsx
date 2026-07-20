import Link from "next/link";
import { ReactNode } from "react";
import { labelize, urgencyClass } from "@/lib/format";

export function Badge({
  children,
  tone = "medium",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${urgencyClass(tone)}`}>{children}</span>;
}

export function StatusBadge({ value }: { value: string }) {
  const tone =
    value.includes("critical") || value.includes("overdue") || value === "expired"
      ? "critical"
      : value.includes("high") || value === "pending" || value === "submitted"
        ? "high"
        : value.includes("low") || value === "completed" || value === "approved"
          ? "low"
          : "medium";
  return <Badge tone={tone}>{labelize(value)}</Badge>;
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header fade-in">
      <div>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="chip-row">{actions}</div> : null}
    </header>
  );
}

export function ExportLinks({ basePath }: { basePath: string }) {
  return (
    <>
      <a className="btn btn-secondary" href={`${basePath}?format=csv`}>
        Export CSV
      </a>
      <a className="btn btn-secondary" href={`${basePath}?format=json`}>
        Export JSON
      </a>
    </>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="empty panel">{children}</div>;
}

export function KeyValue({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="muted" style={{ fontSize: "0.78rem", fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ marginTop: "0.2rem" }}>{children}</div>
    </div>
  );
}

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="muted" style={{ fontSize: "0.88rem" }}>
      ← {label}
    </Link>
  );
}
