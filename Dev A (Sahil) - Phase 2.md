# Developer Contribution & Implementation Plan - Phase 2

**Developer:** Dev A (Sahil)  
**Module:** `apps/survivor-web`  
**Role:** Frontend Survivor Client (Edge Offline PWA & Distress SOS Tracker)  
**Phase:** Phase 2 (Edge Voice Distress, Two-Way Rescuer Relay & PWA Hardening)  
**Date:** September 2026  

---

## 1. Context & Monorepo Status (Post Phase 1)

In Phase 1, the core **Survivor Web Client** was built, tested, and integrated:
- Standalone Next.js 15 PWA running on the edge.
- IndexedDB offline queue engine (`idb`, `pendingIncidents`).
- Automatic background queue drainage on `online` reconnect events.
- Panic-resilient UI with 56px+ tap targets, 1-tap browser geolocation capture, and category selection.
- Offline ID polling guard (`isLocalIncidentId`) pausing 404 polling on temporary IDs.
- Deterministic local survival directives and 5-second polling for Bedrock AI triage actions.
- Full monorepo schema dual-compatibility (`details` and root emergency fields).

---

## 2. Phase 2 Scope & Architectural Deliverables

As defined in the **CloudBeacon PRD Architecture (Stage 1: The Disaster Edge & Stage 3: Two-Way Emergency Dispatch)**, Phase 2 upgrades the survivor client from a basic text SOS form into a true zero-latency, two-way disaster relay terminal.

### Deliverable 1: Voice SOS Audio Distress Capture (PRD Stage 1: Item 2)
* **PRD Requirement**: *"Allows trapped survivors to send voice and text SOS messages even when the internet and cell towers are completely destroyed."*
* **Architecture & Implementation**:
  - Trapped victims pinned under debris or surrounded by smoke cannot type.
  - Implement a 1-tap **"Record Voice Distress"** button with a 10-15s micro-timer using native browser `MediaRecorder` (`audio/webm` or `audio/ogg`).
  - **Local Persistence**: Save audio Blob directly into IndexedDB (`pendingIncidents`) alongside location and category.
  - **Transmission**: Base64 or multipart upload to `POST /api/incidents` for downstream transcription by Amazon Bedrock (Claude 3.5).

### Deliverable 2: Rescuer En-Route Tracking & Deployed Units (PRD Stage 3: Item 9 & 10)
* **PRD Requirement**: Close the feedback loop by showing survivors real-time proof of incoming help.
* **Architecture & Implementation**:
  - Dev B (Responder Dashboard) dispatches rescue units via `PATCH /api/incidents/:id` updating `triage.assignedUnits: ["Boat Unit-4", "Medic-2"]`.
  - When polled via `GET /api/incidents/:id`, `IncidentStatus.tsx` renders a prominent **"Rescue Team Deployed"** card:
    - Lists active unit callsigns (`Boat Unit-4`).
    - Provides deterministic reassurance guidance: *"Stay in your current safe location. Rescue teams have been deployed to your GPS coordinates."*
    - Transitions dispatch status indicator to `IN PROGRESS`.

### Deliverable 3: High-Priority Two-Way Evacuation Alerts (PRD Stage 3: Item 10 - Amazon SNS/SES)
* **PRD Requirement**: Rapid dissemination of emergency evacuation orders when secondary hazards occur.
* **Architecture & Implementation**:
  - When coordinators trigger broadcast alerts, `triage.suggestedAction` updates on the incident.
  - Render an urgent **Flash Emergency Alert Modal / Banner** with audio alert tones and high-visibility flashing warning bars.

### Deliverable 4: Zero-Data PWA Service Worker & Captive Portal Caching
* **PRD Requirement**: Instant loading on `EMERGENCY-SOS-HELP` captive Wi-Fi hotspots with zero cellular backhaul.
* **Architecture & Implementation**:
  - Register a dedicated Service Worker with `CacheFirst` strategy for all Next.js static bundles, icons, and stylesheets.
  - Provide `manifest.json` for standalone home-screen installation.
  - Guarantees sub-500ms page load times even under complete backhaul loss.

### Deliverable 5: OLED Ultra Low-Power "Survival Mode"
* **PRD Requirement**: Battery preservation over 24-72 hours of survival.
* **Architecture & Implementation**:
  - `#000000` pure black OLED background saving up to 60% display power.
  - Battery API integration (`navigator.getBattery()`): automatically throttles polling from 5s to 30s when battery is `< 20%`.
  - Disables CPU-heavy animations.

### Deliverable 6: Clean Workspace Package Ingestion
* **Architecture & Implementation**:
  - Add `"@rescue-link/schema": "*"` to `apps/survivor-web/package.json`.
  - Re-export domain schemas directly from `@rescue-link/schema` in `src/lib/validation.ts`.

---

## 3. Cross-Developer Interface Contract for Phase 2

| Feature | Dev A (Survivor Web) | Interfacing Module / Dev | Expected API / Data Contract |
| :--- | :--- | :--- | :--- |
| **Voice Distress SOS** | Output: Audio Blob / base64 string | Dev C (`apps/api`) & AWS Bedrock | Payload field `audioBlob?: string` in `SOSSubmissionSchema` |
| **Rescuer En-Route Tracking** | Input: `triage.assignedUnits` array | Dev B (`apps/responder-web`) | Ingests `assignedUnits: string[]` from `GET /api/incidents/:id` |
| **Flash Evacuation Directives** | Input: `triage.suggestedAction` updates | Dev B & Dev C (SNS / Bedrock) | Ingests updated AI directive & triggers audio/visual modal |
| **Shared Schema Ingestion** | Workspace dependency | Dev C (`packages/schema`) | Consumes `@rescue-link/schema` directly from monorepo |
