# RescueLink Monorepo Shared Schema (`@rescue-link/schema`)

Contains shared TypeScript interfaces, Zod runtime validators, and data contracts across frontend apps (`survivor-web`, `responder-web`) and backend services (`api`).

---

## REST API Specification

### 1. `POST /api/incidents`
Creates a new distress SOS incident (Survivor client).

**Request Body (`SOSSubmission`):**
```json
{
  "category": "flood",
  "description": "Flooding on ground floor, 3 people stuck on roof",
  "location": {
    "lat": 37.7749,
    "lng": -122.4194,
    "label": "San Francisco, CA"
  },
  "peopleAffected": 3,
  "urgentNeeds": ["boat", "medical"],
  "reporter": {
    "contactMethod": "phone",
    "contactValue": "+14155552671"
  }
}
```

**Response (HTTP 201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "createdAt": 1726300000000,
  "updatedAt": 1726300000000,
  "status": "new",
  "priority": "pending_triage",
  "location": { "lat": 37.7749, "lng": -122.4194, "label": "San Francisco, CA" },
  "reporter": { "contactMethod": "phone", "contactValue": "+14155552671" },
  "details": {
    "category": "flood",
    "description": "Flooding on ground floor, 3 people stuck on roof",
    "peopleAffected": 3,
    "urgentNeeds": ["boat", "medical"]
  }
}
```

---

### 2. `GET /api/incidents`
Lists all incidents (Responder client). Supports optional query params: `status`, `priority`.

**Response (HTTP 200 OK):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "createdAt": 1726300000000,
    "updatedAt": 1726300000000,
    "status": "new",
    "priority": "critical",
    "location": { "lat": 37.7749, "lng": -122.4194 },
    "details": { "category": "flood", "description": "...", "peopleAffected": 3, "urgentNeeds": ["boat"] }
  }
]
```

---

### 3. `GET /api/incidents/:id`
Fetches detailed info for a single incident by ID.

**Response (HTTP 200 OK):**
Returns the complete `Incident` object.

---

### 4. `PATCH /api/incidents/:id`
Updates an incident's status or assigned responder.

**Request Body:**
```json
{
  "status": "in_progress",
  "assignedTo": "responder-unit-1"
}
```

---

### 5. `POST /api/incidents/:id/acknowledge`
Convenience wrapper endpoint to transition status to `acknowledged`.
