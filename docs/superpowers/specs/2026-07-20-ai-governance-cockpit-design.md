# AI Governance Manager Cockpit — Design Spec

## Goal

A self-hostable, practitioner-first web app for an AI Governance Manager to run day-to-day AI governance aligned to NIST AI RMF, EU AI Act, and ISO/IEC 42001. Single deploy, no required external services, full CSV/JSON export, audit-friendly versioning.

## Target users & roles

| Role | Access |
|------|--------|
| `admin` / `governance_manager` | Full CRUD across modules |
| `committee_member` | Meetings, decisions, read inventory/policies |
| `submitter` | Intake submit + own status + attestations |
| `executive` | Read-only dashboards |
| `auditor` | Scoped read-only + export |

Demo mode: pick a persona at login (passwordless for seed users).

## Architecture

**Stack**

- Next.js (App Router) + TypeScript — UI + API routes in one process
- SQLite via better-sqlite3 + Drizzle ORM — zero external DB
- Tailwind CSS — app UI (operational cockpit, not marketing site)
- Cookie session auth (iron-session or signed cookies)
- Docker single-container deploy (`docker compose up`)

**Why this stack:** one binary-ish deploy, portable data file, type-safe schema, easy OSS contribution. Feed fetch for Regulatory Watch is optional outbound; app works offline without it.

**Layout**

```
src/
  app/                  # routes (triage home, modules, API)
  components/           # shared UI
  lib/
    db/                 # schema, migrations, seed, queries
    auth/               # sessions + RBAC
    export/             # CSV/JSON helpers
    frameworks/         # structured NIST / EU AI Act / ISO refs
    audit/              # write audit events + version helpers
```

## Core data model (summary)

Root: `ai_systems` (inventory). All other modules FK to it where applicable.

- `ai_systems` + `ai_system_lifecycle_events`
- `intake_submissions` + `risk_methodology_versions` + `risk_factors` + `hard_gates` + `evaluation_scores` + `tier_obligations`
- `policies` + `policy_versions` + `policy_framework_maps` + `attestations`
- `regulatory_sources` + `regulatory_items` + `dispositions`
- `meetings` + `agenda_items` + `decisions` + `action_items`
- `exceptions` (versioned, mandatory expiry)
- `audit_events` (who/when/what on every mutation)
- `users` + `sessions`
- `custom_metrics` (executive dashboard definitions)
- `triage_items` materialized or computed view from live queues

Framework references are structured IDs (e.g. `NIST:MAP.1.1`, `EU:Art.6`, `ISO:A.6.2.3`), not free text.

## Module behavior (MVP)

1. **Inventory** — CRUD, lifecycle transitions with history, review dates by tier, linked artifacts panel, list filters, export.
2. **Intake** — submit form → queue → score with versioned methodology (sliders + hard gates) → obligation set → approve creates/links inventory.
3. **Policies** — versioned records, tier/category/role applicability, framework maps, reverse query, attestation assign/complete.
4. **Triage Inbox** — unified actionable queue (home screen).
5. **Committee** — auto-agenda from live state, meeting notes, decision register, action items.
6. **Exceptions** — policy+system, acceptor, expiry, renewal as new version.
7. **Regulatory Watch** — default sources, triage dispositions, link to policies/systems/tasks; graceful without fetch.
8. **Executive** — default widgets + admin custom metrics; click-through; snapshot export.
9. **Self-service** — submitter portal for intake status, obligations, attestations.

## Cross-cutting

- Audit trail on create/update/state-change
- Version immutability for evaluations, policies, exceptions, decisions
- Export on every list and detail (CSV + JSON)
- Seed data covering every module
- MIT license, CONTRIBUTING.md, README with Docker quickstart

## Non-goals (v1)

- SSO/SAML, multi-tenant SaaS, embedded full framework legal text, MLOps pipelines, email/Slack integrations (beyond optional outbound RSS).

## UI direction

Operational cockpit: dense but calm. Deep teal/ink primary, warm paper secondary surfaces, Source Serif for display labels + IBM Plex Sans for UI. No purple gradients, no card-heavy dashboards in the hero sense — triage is a work queue; modules are clear list→detail flows.
