import { Incident } from '@rescue-link/schema';
import { bedrockService } from './bedrockService';
import { incidentStore } from '../store/incidentStore';
import { eventStreamManager } from './eventStream';

export class TriageWorkflowOrchestrator {
  /**
   * Asynchronously triages an incoming incident using Bedrock AI (or fallback engine),
   * updates the store, and broadcasts an SSE update to all connected responders.
   */
  async runTriage(incident: Incident): Promise<Incident> {
    try {
      const triageResult = await bedrockService.triageIncident(incident);

      const updated = await incidentStore.update(incident.id, {
        priority: triageResult.priority,
        triage: {
          ...(incident.triage || {}),
          ...triageResult.triage,
        },
      });

      const finalIncident = updated || incident;

      // Broadcast updated incident state via SSE
      eventStreamManager.broadcast({
        type: 'incident:updated',
        incident: finalIncident,
        timestamp: Date.now(),
      });

      return finalIncident;
    } catch (error) {
      console.error(`[TriageWorkflow] Failed async triage for incident ${incident.id}:`, error);
      return incident;
    }
  }
}

export const triageWorkflow = new TriageWorkflowOrchestrator();
