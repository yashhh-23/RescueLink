# Developer Contribution & Handoff Report (Phase 1 & Phase 2 Roadmap)

**Developer:** Dev A (Sahil)  
**Module:** `apps/survivor-web`  
**Role:** Frontend Survivor Client (Edge Offline PWA & Distress SOS Tracker)  
**Phase Status:** Phase 1 (Completed & Verified) | Phase 2 (Roadmap & Implementation Plan)  
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

## 4. Phase 1 Verification & Monorepo Integration Status (Completed)

- [x] **Monorepo Workspaces & Root Linking**: Integrated into npm workspaces alongside `@rescue-link/schema`, `@rescue-link/config`, `apps/api`, and `apps/responder-web`.
- [x] **Contract Dual-Compatibility**: Resolved schema divergence; `apps/api` now emits both top-level emergency fields (`category`, `description`, `peopleAffected`, `urgentNeeds`) and nested `details` so `IncidentResponseSchema.safeParse()` passes 100%.
- [x] **Next.js Proxy Rewrites**: Configured `apps/survivor-web/next.config.mjs` to automatically proxy relative `/api/*` requests to `http://localhost:3001` during local dev.
- [x] **Quality Gate**: 27/27 monorepo tests passing, 0 TypeScript errors across all workspaces, and production build cleanly verified.

---

## 5. Phase 2 Roadmap: Survivor Edge PWA & Two-Way Relay

As per the **CloudBeacon PRD Architecture (Stage 1: The Disaster Edge & Stage 3: Two-Way Emergency Dispatch)**, the following deliverables constitute the **Phase 2 scope for Dev A (Sahil)** to provide complete cross-team alignment:

### 1. Voice SOS Audio Distress Capture (PRD Stage 1: Item 2 - Captive Portal)
* **PRD Requirement**: *"Allows trapped survivors to send voice and text SOS messages even when the internet and cell towers are completely destroyed."*
* **Architecture & API Context**:
  - Victims trapped under collapsed structures or blinded by smoke cannot type descriptions.
  - Implement a 1-tap **"Record Voice Distress"** button using browser `MediaRecorder` API (capturing 10-15s compressed `audio/webm` or `audio/ogg`).
  - **Offline Storage**: Store the audio Blob in local IndexedDB (`pendingIncidents`).
  - **Backend Transmission**: Send audio as base64 or multipart payload to `POST /api/incidents`, ready for downstream transcription and analysis by Amazon Bedrock (Claude 3.5).

### 2. Rescuer En-Route & Unit Deployment Tracking (PRD Stage 3: Item 9 & 10)
* **PRD Requirement**: Two-way feedback loop showing survivors that rescue teams are actively deploying.
* **Architecture & API Context**:
  - When Dev B (Responder Dashboard) assigns rescue units via `PATCH /api/incidents/:id` (`triage.assignedUnits: ["Boat Unit-4", "Medic-2"]`), this data is returned in the 5-second polling loop from `GET /api/incidents/:id`.
  - **UI Component**: In `IncidentStatus.tsx`, render a prominent **"Rescue Team Deployed"** card:
    - Lists active unit callsigns (`Boat Unit-4`).
    - Displays reassuring deterministic survival guidance: *"Rescue unit assigned. Remain in your current position; help is en route to your GPS coordinates."*
    - Automatically updates dispatch status circle to `IN PROGRESS`.

### 3. High-Priority Two-Way Evacuation Alerts (PRD Stage 3: Item 10 - Amazon SNS/SES)
* **PRD Requirement**: Flash evacuation alerts when secondary hazards emerge (e.g. dam breach, wind shift).
* **Architecture & API Context**:
  - When EOC responders broadcast emergency evacuation orders, `triage.suggestedAction` or an alert flag is updated on the incident.
  - **UI Component**: Render a full-screen high-contrast **Flash Emergency Warning Modal** with audio alert beeps and clear instructions (e.g. *"FLASH EVACUATION ORDER: Move immediately to higher elevation"*).

### 4. Zero-Data PWA Service Worker & Captive Portal Caching
* **PRD Requirement**: Instant loading on `EMERGENCY-SOS-HELP` Wi-Fi hotspots with zero internet backhaul.
* **Architecture & API Context**:
  - Implement a dedicated PWA Service Worker with a `CacheFirst` strategy for all Next.js static bundles, icons, and styling.
  - Add `manifest.json` for standalone home-screen installation on iOS/Android.
  - Guarantees `< 500ms` instantaneous boot time even if the captive Wi-Fi signal drops completely.

### 5. OLED Ultra Low-Power "Survival Mode"
* **PRD Requirement**: Victims often endure 24-72 hours awaiting rescue with low smartphone battery.
* **Architecture & API Context**:
  - Implement an ultra-low-power mode:
    - `#000000` true OLED pure black background (saving up to 60% display power).
    - Battery detection via `navigator.getBattery()`: automatically throttles polling interval from 5s to 30s when battery is `< 20%`.
    - Disables non-essential micro-animations to minimize CPU wakeups.

### 6. Monorepo Package Clean Ingestion
* **Architecture & API Context**:
  - Add `"@rescue-link/schema": "*"` to `apps/survivor-web/package.json`.
  - Re-export domain schemas directly from `@rescue-link/schema` in `src/lib/validation.ts`, completing full workspace package adoption.

---

## 6. Cross-Developer Interface Contract Summary for Phase 2

| Feature | Dev A (Survivor Web) Output / Input | Interfacing Module / Dev | Expected API / Data Contract |
| :--- | :--- | :--- | :--- |
| **Voice Distress SOS** | Output: Audio Blob / base64 string | Dev C (`apps/api`) & AWS Bedrock | Payload field `audioBlob?: string` in `SOSSubmissionSchema` |
| **Rescuer En-Route Tracking** | Input: `triage.assignedUnits` array | Dev B (`apps/responder-web`) | Ingests `assignedUnits: string[]` from `GET /api/incidents/:id` |
| **Flash Evacuation Directives** | Input: `triage.suggestedAction` updates | Dev B & Dev C (SNS / Bedrock) | Ingests updated AI directive & triggers audio/visual modal |
| **Shared Schema Ingestion** | Workspace dependency | Dev C (`packages/schema`) | Consumes `@rescue-link/schema` directly from monorepo |
