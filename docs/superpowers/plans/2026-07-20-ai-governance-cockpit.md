# AI Governance Manager Cockpit Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox syntax.

**Goal:** Ship a self-hostable AI Governance Manager cockpit with all nine modules, seed data, Docker deploy, and export/audit everywhere.

**Architecture:** Next.js App Router monolith + SQLite/Drizzle + cookie sessions + Tailwind. Inventory is the root entity; other modules reference it.

**Tech Stack:** Next.js 15, TypeScript, Drizzle ORM, better-sqlite3, Tailwind CSS, Docker Compose, MIT license.

## Global Constraints

- No required external services for core functionality
- Framework refs are structured selectable IDs
- Key records versioned; audit who/when on mutations
- Every list/record exports CSV/JSON
- Seed demo data for all modules
- Branch naming: `cursor/<name>-fddf`

---

### Task 1: Scaffold + schema + auth

- [ ] Create Next.js app with Tailwind
- [ ] Drizzle schema for all entities + migrations
- [ ] Session auth with roles + seed users
- [ ] App shell (nav by role) + login persona picker

### Task 2: AI Inventory

- [ ] List/detail/create/edit + lifecycle transitions
- [ ] Review scheduling + overdue surfacing
- [ ] Linked artifacts panel + CSV/JSON export

### Task 3: Intake & Risk Evaluation

- [ ] Versioned methodology (factors, weights, hard gates, obligations)
- [ ] Submitter form + manager queue + scoring UI
- [ ] Approve → create/link inventory

### Task 4: Policy Library

- [ ] Versioned policies + framework maps + applicability
- [ ] Reverse query by framework ID
- [ ] Attestation assign/complete

### Task 5: Triage Inbox + Exceptions + Committee

- [ ] Unified triage home
- [ ] Exceptions with mandatory expiry + renewal versions
- [ ] Meetings, auto-agenda, decisions, action items

### Task 6: Regulatory Watch + Executive + Self-service

- [ ] Sources, items, dispositions (manual + optional fetch)
- [ ] Default + custom metrics widgets
- [ ] Submitter portal

### Task 7: Polish for OSS

- [ ] Seed script, Docker Compose, README, CONTRIBUTING, LICENSE
- [ ] Smoke test build
