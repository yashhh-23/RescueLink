import { z } from 'zod';
import {
  IncidentSchema,
  type IncidentResponse,
  type IncidentStatus,
  type SensorReading,
  type HazardZone,
} from '@/lib/schema';

export class ApiError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request(path: string, init?: RequestInit & { signal?: AbortSignal }): Promise<unknown> {
  let response: Response;

  try {
    response = await fetch(`/api${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError('Unable to reach the server. Check your connection.');
  }

  if (!response.ok) {
    // apps/api's real error shape is `{ error: string, ... }` (see
    // apps/api/src/app.ts and routes/incidents.ts), with `message` only
    // present on 500s. Prefer `error`, fall back to `message`, then generic.
    let message = `Request failed with status ${response.status}.`;
    try {
      const body = await response.json();
      if (body && typeof body.error === 'string') message = body.error;
      else if (body && typeof body.message === 'string') message = body.message;
    } catch {
      // Non-JSON error body; keep the generic message.
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) return undefined;

  try {
    return await response.json();
  } catch {
    throw new ApiError('The server returned an unreadable response.');
  }
}

function parseIncident(data: unknown): IncidentResponse {
  const result = IncidentSchema.safeParse(data);
  if (!result.success) {
    throw new ApiError('The server returned an incident that does not match the expected shape.');
  }
  return result.data;
}

const IncidentListEnvelopeSchema = z.union([
  z.array(z.unknown()),
  z.object({ incidents: z.array(z.unknown()) }),
]);

function parseIncidentList(data: unknown): IncidentResponse[] {
  const envelope = IncidentListEnvelopeSchema.safeParse(data);
  if (!envelope.success) {
    throw new ApiError('The server returned an unexpected incident list shape.');
  }
  const rawList = Array.isArray(envelope.data) ? envelope.data : envelope.data.incidents;
  return rawList.map(parseIncident);
}

export async function getIncidents(signal?: AbortSignal): Promise<IncidentResponse[]> {
  const data = await request('/incidents', { signal });
  return parseIncidentList(data);
}

export async function getIncident(id: string, signal?: AbortSignal): Promise<IncidentResponse> {
  const data = await request(`/incidents/${encodeURIComponent(id)}`, { signal });
  return parseIncident(data);
}

export interface UpdateIncidentPayload {
  status?: IncidentStatus;
  assignedTo?: string;
  triage?: { assignedUnits?: string[] };
}

/**
 * PATCH /api/incidents/:id — confirmed real (apps/api/src/routes/incidents.ts).
 * Used for status transitions, dispatcher assignment, and unit assignment.
 * The backend deep-merges `triage`, so this never clobbers Bedrock AI fields.
 */
export async function updateIncident(
  id: string,
  payload: UpdateIncidentPayload,
  signal?: AbortSignal
): Promise<IncidentResponse> {
  const data = await request(`/incidents/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    signal,
  });
  return parseIncident(data);
}

/**
 * POST /api/incidents/:id/acknowledge — confirmed real. Convenience
 * transition to "acknowledged" that also lets a dispatcher claim ownership.
 */
export async function acknowledgeIncident(
  id: string,
  assignedTo?: string,
  signal?: AbortSignal
): Promise<IncidentResponse> {
  const data = await request(`/incidents/${encodeURIComponent(id)}/acknowledge`, {
    method: 'POST',
    body: JSON.stringify(assignedTo ? { assignedTo } : {}),
    signal,
  });
  return parseIncident(data);
}

/**
 * Batch status update. There is no batch endpoint on the backend — this
 * loops the real, confirmed PATCH endpoint per incident and reports partial
 * failure so a geofence action on 50 incidents doesn't silently half-fail.
 */
export interface BatchUpdateResult {
  succeeded: string[];
  failed: { id: string; message: string }[];
}

export async function batchUpdateStatus(
  ids: string[],
  status: IncidentStatus
): Promise<BatchUpdateResult> {
  const results = await Promise.allSettled(ids.map((id) => updateIncident(id, { status })));

  const succeeded: string[] = [];
  const failed: { id: string; message: string }[] = [];

  results.forEach((result, index) => {
    const id = ids[index];
    if (id === undefined) return;
    if (result.status === 'fulfilled') {
      succeeded.push(id);
    } else {
      const reason = result.reason;
      failed.push({ id, message: reason instanceof ApiError ? reason.message : 'Update failed.' });
    }
  });

  return { succeeded, failed };
}

// --- Phase 2: assumed / not-yet-built backend endpoints ---
//
// Each function below calls an endpoint that does not exist in apps/api yet
// (confirmed by reading apps/api/src/app.ts — only /api/health and
// /api/incidents are mounted). They fail gracefully — returning an empty
// result or a typed "not available" error — rather than crashing the
// dashboard, so the rest of Phase 2's UI can be built and reviewed now and
// simply start working the day the backend adds these routes.

export interface BroadcastPayload {
  message: string;
  recipientMethod: string;
  recipientValue: string;
}

/** Assumed: POST /api/incidents/:id/broadcast. Not implemented server-side. */
export async function broadcastIncident(
  id: string,
  payload: BroadcastPayload,
  signal?: AbortSignal
): Promise<{ delivered: boolean }> {
  try {
    await request(`/incidents/${encodeURIComponent(id)}/broadcast`, {
      method: 'POST',
      body: JSON.stringify(payload),
      signal,
    });
    return { delivered: true };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    // 404 is expected until the backend adds this route; any other error
    // (network, 500) is still worth surfacing distinctly to the caller.
    return { delivered: false };
  }
}

/** Assumed: GET /api/sensors. Returns [] (not an error) if unavailable, so
 * the map simply shows no sensor layer instead of an error banner. */
export async function getSensors(signal?: AbortSignal): Promise<SensorReading[]> {
  try {
    const data = await request('/sensors', { signal });
    return Array.isArray(data) ? (data as SensorReading[]) : [];
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    return [];
  }
}

/** Assumed: GET /api/hazard-zones. Same graceful-empty behavior. */
export async function getHazardZones(signal?: AbortSignal): Promise<HazardZone[]> {
  try {
    const data = await request('/hazard-zones', { signal });
    return Array.isArray(data) ? (data as HazardZone[]) : [];
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    return [];
  }
}
