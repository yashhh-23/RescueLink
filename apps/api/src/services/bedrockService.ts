import { Incident, IncidentTriage, Priority } from '@rescue-link/schema';
import { CONFIG } from '@rescue-link/config';

export interface BedrockTriageResult {
  priority: Priority;
  triage: IncidentTriage;
}

export class BedrockService {
  /**
   * Generates AI Triage assessment for an incoming SOS Incident.
   * Gracefully falls back to heuristic rule-based AI engine when AWS credentials are not provided.
   */
  async triageIncident(incident: Incident): Promise<BedrockTriageResult> {
    // If AWS credentials exist, attempt active Bedrock SDK invocation
    if (process.env.AWS_ACCESS_KEY_ID || process.env.AWS_PROFILE) {
      try {
        return await this.invokeBedrockSDK(incident);
      } catch (error) {
        console.warn('[BedrockService] AWS Bedrock call failed, using heuristic fallback:', error);
      }
    }

    // Default intelligent heuristic AI triage generator
    return this.generateHeuristicTriage(incident);
  }

  private async invokeBedrockSDK(incident: Incident): Promise<BedrockTriageResult> {
    const pkg = '@aws-sdk/client-bedrock-runtime';
    const { BedrockRuntimeClient, InvokeModelCommand }: any = await import(pkg);
    const client = new BedrockRuntimeClient({ region: CONFIG.AWS_REGION });

    const prompt = `Human: You are an expert emergency dispatch AI for RescueLink. Triage the following disaster SOS report:
Category: ${incident.category}
Description: ${incident.description}
People Affected: ${incident.peopleAffected}
Urgent Needs: ${incident.urgentNeeds.join(', ') || 'None specified'}
Location: Lat ${incident.location.lat}, Lng ${incident.location.lng}

Respond ONLY with a valid JSON object matching this exact schema:
{
  "priority": "critical" | "high" | "medium" | "low",
  "suggestedAction": "Immediate survival directive for survivor",
  "summary": "Brief dispatcher summary",
  "reasoning": "Reason for priority assignment",
  "confidence": 0.95
}
Assistant:`;

    const input = {
      modelId: CONFIG.BEDROCK_MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        prompt,
        max_tokens_to_sample: 300,
        temperature: 0.2,
      }),
    };

    const command = new InvokeModelCommand(input);
    const response = await client.send(command);
    const responseBody = new TextDecoder().decode(response.body);
    const parsed = JSON.parse(responseBody);
    const aiText = parsed.completion || parsed.output?.text || responseBody;

    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse JSON from Bedrock output');
    }

    const data = JSON.parse(jsonMatch[0]);
    return {
      priority: data.priority || 'high',
      triage: {
        suggestedAction: data.suggestedAction || 'Move to high ground immediately.',
        summary: data.summary || `AI Triaged ${incident.category} distress call.`,
        reasoning: data.reasoning || 'Evaluated severity based on reported casualty risk.',
        confidence: typeof data.confidence === 'number' ? data.confidence : 0.9,
      },
    };
  }

  /**
   * Intelligent heuristic AI fallback engine when offline or without active AWS keys.
   */
  private generateHeuristicTriage(incident: Incident): BedrockTriageResult {
    let priority: Priority = 'medium';
    let suggestedAction = 'Stay calm, keep location service active, and await rescue team dispatch.';
    let summary = `Triage completed for ${incident.category} alert.`;
    let reasoning = 'Standard distress priority based on reported needs.';

    const needs = incident.urgentNeeds || [];
    const count = incident.peopleAffected || 1;

    if (
      needs.includes('medical') ||
      needs.includes('boat') ||
      count >= 5 ||
      incident.category === 'fire'
    ) {
      priority = 'critical';
      suggestedAction =
        incident.category === 'flood'
          ? 'URGENT: Move to roof/highest level immediately. Signal rescue boats with bright cloth.'
          : incident.category === 'fire'
          ? 'CRITICAL: Stay low beneath smoke. Cover face with wet cloth and move away from fire line.'
          : 'CRITICAL: Prepare for immediate medical evacuation. Keep air passages clear.';
      summary = `CRITICAL DISTRESS: ${count} people affected. High casualty risk.`;
      reasoning = `Assigned CRITICAL priority due to urgent needs [${needs.join(', ')}] and ${count} casualties reported.`;
    } else if (
      needs.includes('clean_water') ||
      needs.includes('food') ||
      incident.category === 'landslide' ||
      count >= 3
    ) {
      priority = 'high';
      suggestedAction =
        incident.category === 'landslide'
          ? 'HIGH HAZARD: Move perpendicular to landslide flow direction toward stable rocky ground.'
          : 'High priority alert registered. Prepare emergency supply pickup zone.';
      summary = `HIGH PRIORITY: ${incident.category} incident requiring active responder intervention.`;
      reasoning = `Assigned HIGH priority based on hazard classification (${incident.category}) and survivor population.`;
    } else {
      priority = 'medium';
      suggestedAction = 'Emergency report logged. Conserve device battery and keep emergency whistle ready.';
      summary = `Standard ${incident.category} alert queued for responder review.`;
      reasoning = 'Assigned MEDIUM priority for stable non-life-threatening assistance request.';
    }

    return {
      priority,
      triage: {
        suggestedAction,
        summary,
        reasoning,
        confidence: 0.92,
      },
    };
  }
}

export const bedrockService = new BedrockService();
