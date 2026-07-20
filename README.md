# AI Governance Cockpit

Open-source operational cockpit for an **AI Governance Manager** — the person who runs an organization’s AI governance program day to day.

This is not a general GRC suite and not an MLOps platform. It is a practitioner-first, self-hostable app for inventory, intake risk evaluation, policies, exceptions, committee decisions, regulatory triage, and leadership dashboards — aligned to **NIST AI RMF**, the **EU AI Act**, and **ISO/IEC 42001** via structured framework reference fields.

## Features

1. **AI Inventory** — lifecycle history, review scheduling, linked artifacts, CSV/JSON export  
2. **Use-Case Intake & Risk Evaluation** — weighted factors, hard gates, versioned methodology, obligation sets  
3. **Policy Library** — applicability metadata, framework mappings, reverse queries, attestations  
4. **Triage Inbox** — unified queue of everything awaiting action  
5. **Governance Committee** — auto-agenda, decision register, action items  
6. **Exceptions & Waivers** — mandatory expiry, named risk acceptor, versioned renewals  
7. **Regulatory Watch** — source list, disposition log (works offline with manual entry)  
8. **Executive Dashboard** — live metrics with click-through  
9. **Stakeholder Self-Service** — submit, track status, attest  

Cross-cutting: role-based access, audit events on mutations, export everywhere, SQLite data file you own.

## Quick start (local)

```bash
npm install
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and choose a demo persona (no passwords in the seed environment).

## Docker (single command)

```bash
docker compose up --build
```

Then open [http://localhost:3000](http://localhost:3000). Data persists in the `cockpit-data` volume. Set `SESSION_SECRET` in production.

## Demo personas

| Persona | Role |
|---------|------|
| Avery Admin | Full admin |
| Morgan Governance | Governance manager (default daily user) |
| Casey Committee | Committee member |
| Sam Submitter | Business-unit submitter |
| Eden Executive | Read-only executive |
| Alex Auditor | Scoped read-only auditor |

Seed data includes inventory systems, a scored high-risk intake, policies with NIST/EU/ISO maps, an expiring exception, a committee meeting with decisions, and regulatory dispositions.

## Stack

- Next.js (App Router) + TypeScript  
- SQLite via `better-sqlite3` + Drizzle schema  
- Cookie sessions (`iron-session`)  
- Tailwind CSS  

No external services are required for core functionality. Regulatory feed fetching is optional and the app degrades gracefully without outbound network access.

## Useful scripts

```bash
npm run dev          # development server
npm run build        # production build
npm run start        # run production server
npm run db:seed      # migrate + seed if empty
npm run db:reseed    # wipe and reload demo data
npm run lint
```

Database path defaults to `./data/cockpit.db` (override with `DATABASE_PATH`).

## Documentation

- Design: `docs/superpowers/specs/2026-07-20-ai-governance-cockpit-design.md`
- Implementation plan: `docs/superpowers/plans/2026-07-20-ai-governance-cockpit.md`
- Contributing: `CONTRIBUTING.md`

## License

MIT — see `LICENSE`.
