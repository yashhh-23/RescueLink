# Responder Web (Dev 2)

Responder-facing dashboard for Rescue-Link: incident summary, map, filterable
list, incident detail, status workflow (Acknowledge → Start Rescue → Resolve),
and unit assignment.

## Setup

```bash
cd apps/responder-web
npm install
npm run dev
```

If `apps/api` runs on a different origin during local dev (e.g. a separate
port), copy `.env.example` to `.env.local` and set `RESCUE_LINK_API_ORIGIN` —
this proxies `/api/*` there via `next.config.mjs` rewrites, so the browser
code can keep calling relative `/api/...` paths either way.

## Scripts

- `npm run dev` — local development server
- `npm run build` — production build (verified passing)
- `npm run typecheck` — TypeScript, no emit (verified passing, 0 errors)
- `npm run test` — Vitest unit tests (verified passing, 8/8)

## Contract alignment

This was built after reading the actual `apps/survivor-web` code Dev A
pushed, not just the original task brief, so it matches the real contract:

- **`src/lib/schema.ts`** mirrors `apps/survivor-web/src/lib/validation.ts`
  field-for-field (categories, priorities including `pending_triage`,
  statuses — note there is **no `closed`** status, urgent needs, contact
  methods, and the triage shape: `suggestedAction` / `confidence` /
  `assignedUnits` / `notes`). Once `packages/schema` exists as a linked
  workspace package, delete this file and import from there instead — don't
  let the two copies drift.
- **No `assignedTo` field exists anywhere in the contract.** Unit assignment
  is `triage.assignedUnits: string[]`, so `AssignmentControl` reads/writes
  that array instead of inventing a separate field.
- **Fetches use relative `/api/...` paths**, matching the convention already
  established in `survivor-web/src/lib/offlineQueue.ts` and
  `IncidentStatus.tsx`, rather than an env-configured absolute base URL.
- Priority marker/badge colors follow the task spec exactly: critical=red,
  high=orange, medium=yellow, low=green. `pending_triage` (not in the
  original 4-color spec) gets a neutral slate so it stays visually distinct.

## Two assumptions that still need confirming with apps/api

Dev A's handoff only documents `POST /api/incidents` (survivor submission)
and `GET /api/incidents/:id` (survivor polling) — nothing for responders yet,
since `apps/api` hasn't been built. This app assumes:

1. **`GET /api/incidents`** — returns either a bare array or
   `{ incidents: [...] }` (both are handled) — the standard list endpoint
   responders need for the dashboard.
2. **`PATCH /api/incidents/:id`** — accepts `{ status }` and/or
   `{ triage: { assignedUnits } }` partial updates, used for both the
   Acknowledge/Start Rescue/Resolve actions and unit assignment.

Both are isolated to `src/lib/api.ts` with comments at the call sites — if
the real backend uses different paths or a PATCH-vs-POST-action split,
that's the only file that needs to change.

## Notes

- Polling runs every 15 seconds while the dashboard is open; a manual
  Refresh button is also available. Requests are cancelled on unmount and
  superseded by newer ones (no race conditions on slow responses).
- The map uses Leaflet + OpenStreetMap tiles (no API key required). Location
  is a required field in the schema, so every incident is plottable.
- API responses are validated with `zod` (`IncidentResponseSchema`) before
  being trusted by the UI, so a malformed response fails loudly with a
  retry option rather than rendering broken data.

No files outside `apps/responder-web/` were created or modified.
