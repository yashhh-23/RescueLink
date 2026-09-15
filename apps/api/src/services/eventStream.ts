import { Response } from 'express';
import { Incident } from '@rescue-link/schema';

export interface SSEEvent {
  type: 'incident:created' | 'incident:updated' | 'broadcast:sent';
  incident: Incident;
  message?: string;
  timestamp: number;
}

export class EventStreamManager {
  private clients: Set<Response> = new Set();

  addClient(res: Response): void {
    this.clients.add(res);
  }

  removeClient(res: Response): void {
    this.clients.delete(res);
  }

  broadcast(event: SSEEvent): void {
    const payload = `event: incident\ndata: ${JSON.stringify(event)}\n\n`;
    for (const client of this.clients) {
      try {
        client.write(payload);
      } catch (err) {
        this.clients.delete(client);
      }
    }
  }

  getClientCount(): number {
    return this.clients.size;
  }
}

export const eventStreamManager = new EventStreamManager();
