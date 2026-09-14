import { z } from 'zod';
import {
  IncidentResponseSchema,
  type IncidentResponse,
  type IncidentStatus,
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
    let message = `Request failed with status ${response.status}.`;
    try {
      const body = await response.json();
      if (body && typeof body.message === 'string') message = body.message;
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
  const result = IncidentResponseSchema.safeParse(data);
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

/**
 * GET /api/incidents
 * Not explicitly documented by Dev A's handoff (which covers POST /api/incidents
 * and GET /api/incidents/:id for the survivor client) — assumed here as the
 * standard REST listing endpoint responders need. Confirm with apps/api once
 * it exists and adjust if the real path differs.
 */
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
  triage?: { assignedUnits?: string[] };
}

/**
 * PATCH /api/incidents/:id
 * Also assumed — Dev A's handoff doesn't cover a responder-side mutation
 * endpoint since apps/api hasn't been built yet. Used for both status
 * transitions (Acknowledge / Start Rescue / Resolve) and unit assignment.
 * Update this file once the real contract is confirmed.
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
