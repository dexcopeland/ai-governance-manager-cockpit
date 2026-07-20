# Contributing

Thanks for helping improve the AI Governance Cockpit.

## Local setup

```bash
npm install
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and pick a demo persona.

## Project conventions

- **Inventory first:** `ai_systems` is the root entity; other modules should reference it.
- **Auditability:** mutations should call `recordAudit` and avoid silent overwrites of evaluations, policies, exceptions, and decisions.
- **Exports:** list and detail views should expose CSV/JSON via `/api/export/...`.
- **Framework refs:** use structured IDs from `src/lib/frameworks/refs.ts`, not free text.
- **No required SaaS:** core paths must work with SQLite only; regulatory feed fetch is optional.

## Pull requests

1. Keep changes focused and documented in the PR description.
2. Run `npm run lint` and `npm run build` before requesting review.
3. Add or update seed data when introducing a new module surface.
4. Prefer small, reviewable commits.

## Code of conduct

Be respectful, assume good intent, and prioritize practitioner usefulness over feature sprawl.
