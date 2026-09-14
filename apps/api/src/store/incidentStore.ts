import { Incident, IncidentStatus, Priority } from '@rescue-link/schema';

export class IncidentStore {
  private incidents: Map<string, Incident> = new Map();

  async create(incident: Incident): Promise<Incident> {
    this.incidents.set(incident.id, incident);
    return incident;
  }

  async getById(id: string): Promise<Incident | null> {
    return this.incidents.get(id) || null;
  }

  async list(filter?: { status?: IncidentStatus; priority?: Priority }): Promise<Incident[]> {
    let result = Array.from(this.incidents.values());

    if (filter?.status) {
      result = result.filter((i) => i.status === filter.status);
    }
    if (filter?.priority) {
      result = result.filter((i) => i.priority === filter.priority);
    }

    // Sort newest first
    return result.sort((a, b) => b.createdAt - a.createdAt);
  }

  async update(id: string, updates: Partial<Incident>): Promise<Incident | null> {
    const existing = this.incidents.get(id);
    if (!existing) return null;

    const updated: Incident = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    };

    this.incidents.set(id, updated);
    return updated;
  }

  async clear(): Promise<void> {
    this.incidents.clear();
  }
}

export const incidentStore = new IncidentStore();
