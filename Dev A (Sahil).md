# Developer Contribution & Handoff Report

**Developer:** Dev A (Sahil)  
**Module:** `apps/survivor-web`  
**Role:** Frontend Survivor Client (Edge Offline PWA & Distress SOS Tracker)  
**Date:** September 2026  

---

## 1. Summary of What Has Been Done

I have built the complete, standalone, panic-resilient **Survivor Web Application** in `apps/survivor-web/`. The application operates smoothly on edge captive portals (e.g. `EMERGENCY-SOS-HELP`) during total network blackouts and auto-syncs when edge uplinks reconnect.

### Key Deliverables Implemented:
1. **Offline IndexedDB Queue Engine (`src/lib/offlineQueue.ts`)**:
   - Built a local storage queue using `idb` (`rescue-link-survivor` database with `pendingIncidents` object store).
   - Generates local panic-resilient temporary IDs (`local-${Date.now()}-${random}`).
   - If offline or if network fetch fails, SOS reports persist safely in browser storage across page refreshes and device reboots.

2. **Auto-Drain & Network Sync Hook (`src/hooks/useSyncQueue.ts`)**:
   - Listens to `window.addEventListener('online')` and runs a periodic 10-second background retry loop.
   - Flushes queued incidents sequentially to `POST /api/incidents`.
   - Deletes synced items from IndexedDB only on HTTP 201/200 response and triggers state updates.

3. **Offline ID Polling Guard (`src/components/IncidentStatus.tsx`)**:
   - Prevents console 404 spam: checks `isLocalIncidentId(id)`. If the incident is queued locally (`local-*`), polling is **completely paused**, and an offline holding notice with deterministic local survival guidance is displayed.
   - As soon as the queue sync returns the real server UUID, live 5-second polling against `GET /api/incidents/:id` is automatically activated.

4. **Bedrock AI Directive & Live Status Tracker**:
   - Displays real-time 4-step dispatch status (`new` $\rightarrow$ `acknowledged` $\rightarrow$ `in_progress` $\rightarrow$ `resolved`).
   - Ingests Bedrock AI triage updates (`triage.suggestedAction`) and renders them prominently as "Rescuer & AI Directive".

5. **Panic-Resilient & Accessible SOS UI (`src/components/SOSForm.tsx`)**:
   - 56px+ tap targets for high-stress panic situations.
   - High-contrast emergency color palette (deep blacks, warning yellows, danger reds, active emeralds).
   - 1-tap browser geolocation capture ([useGeolocation.ts](file:///apps/survivor-web/src/hooks/useGeolocation.ts)) with manual lat/lng fallback.
   - People affected counter (+ / - stepper), urgent needs tags (medical, boat, food, clean_water, infant_care), and reporter contact selector.

6. **Contract & Schema Alignment (`src/lib/validation.ts`)**:
   - Strictly matches `packages/schema`:
     - Location coordinates use lowercase `lng`: `{ lat: number, lng: number, label?: string }`.
     - Reporter contract strictly uses `{ contactMethod?: "email" | "phone" | "none", contactValue?: string }`.
     - Enums: Categories (`flood`, `landslide`, `fire`, `other`), Priorities (`critical`, `high`, `medium`, `low`, `pending_triage`), Statuses (`new`, `acknowledged`, `in_progress`, `resolved`).

7. **Verification & Quality Gate**:
   - **TypeScript**: `npm run typecheck` passed (0 errors).
   - **Unit Tests**: `npm run test` (Vitest + `fake-indexeddb`) passed 6/6 tests covering offline queueing, local ID checks, deletion, and mock flush.
   - **Production Build**: `npm run build` (Next.js 15) compiled successfully with static prerendering.

---

## 2. Critical Context for Other Developers

### For Backend / API Engineers (`apps/api`):
- **Submission Endpoint (`POST /api/incidents`)**:
  - The survivor app POSTs payloads structured as:
    ```json
    {
      "category": "flood",
      "description": "Rising water in living room",
      "location": { "lat": 37.7749, "lng": -122.4194, "label": "GPS Auto-Detected" },
      "peopleAffected": 3,
      "urgentNeeds": ["boat", "medical"],
      "reporter": { "contactMethod": "phone", "contactValue": "+15550199" }
    }
    ```
  - **Required Response**: The backend should return HTTP `201` (or `200`) with `{ "id": "<server-uuid>" }` or `{ "incident": { "id": "<server-uuid>" } }`.
- **Status & Triage Polling (`GET /api/incidents/:id`)**:
  - The survivor app polls this every 5 seconds once a real server UUID exists.
  - When Bedrock AI triage finishes, populate `triage.suggestedAction` in the response JSON so survivor clients immediately see live AI instructions.

### For Monorepo / Schema Leads (`packages/schema`):
- All types in `apps/survivor-web/src/lib/validation.ts` are 1:1 identical to `packages/schema`.
- When `@rescue-link/schema` is linked via workspace packages (npm/pnpm/yarn workspaces), `src/lib/validation.ts` can directly re-export from `@rescue-link/schema`.

### For Responder Dashboard Engineers (`apps/responder-web`):
- Survivor submissions default to `priority: "pending_triage"` and `status: "new"`.
- Responders will receive coordinates using `{ lat, lng }` (lowercase `lng`).

---

## 3. How to Run & Verify Locally

From the root or from `apps/survivor-web`:

```bash
# Navigate to the survivor web client
cd apps/survivor-web

# Install dependencies (Next.js 15, idb, zod, lucide-react, vitest, fake-indexeddb)
npm install

# Run TypeScript typecheck
npm run typecheck

# Run Vitest unit tests
npm run test

# Run Next.js production build
npm run build

# Start development server
npm run dev
```

---

## 4. Pending / Next Steps (Post-Integration)

- [ ] Monorepo package linking: Once root `package.json` workspace is set up, link `@rescue-link/schema` as a workspace dependency.
- [ ] Service worker manifest / PWA asset bundle caching for zero-dependency captive portal splash page.
- [ ] End-to-end integration test against running `apps/api` mock/local server.
