import { Incident } from '@rescue-link/schema';
import { CONFIG } from '@rescue-link/config';

export interface NotificationResult {
  snsSent: boolean;
  sesSent: boolean;
  mode: 'aws' | 'mock';
  message: string;
}

export class NotificationService {
  /**
   * Main entry point to send critical/high priority disaster notifications via Amazon SNS and SES.
   */
  async sendCriticalAlert(incident: Incident): Promise<NotificationResult> {
    if (incident.priority !== 'critical' && incident.priority !== 'high') {
      return {
        snsSent: false,
        sesSent: false,
        mode: 'mock',
        message: `Incident priority '${incident.priority}' does not require critical notifications.`,
      };
    }

    const hasAwsKeys = Boolean(process.env.AWS_ACCESS_KEY_ID || process.env.AWS_PROFILE);

    if (hasAwsKeys) {
      try {
        const [snsResult, sesResult] = await Promise.all([
          this.sendSnsNotification(incident),
          this.sendSesNotification(incident),
        ]);
        return {
          snsSent: snsResult,
          sesSent: sesResult,
          mode: 'aws',
          message: 'Alert dispatched via AWS SNS and SES.',
        };
      } catch (error) {
        console.warn('[NotificationService] AWS alert dispatch error, using local fallback:', error);
      }
    }

    // Local Mock Notification Fallback Engine
    this.logMockNotification(incident);
    return {
      snsSent: true,
      sesSent: true,
      mode: 'mock',
      message: 'Alert logged via Local Mock Notification Engine.',
    };
  }

  /**
   * Send SNS SMS / Topic alert via AWS SDK v3
   */
  private async sendSnsNotification(incident: Incident): Promise<boolean> {
    try {
      const snsPkg = '@aws-sdk/client-sns';
      const { SNSClient, PublishCommand }: any = await import(snsPkg);
      const snsClient = new SNSClient({ region: CONFIG.AWS_REGION });

      const smsText = `[RESCUELINK ${incident.priority.toUpperCase()} ALERT] ${incident.category.toUpperCase()} at Lat:${incident.location.lat}, Lng:${incident.location.lng}. ${incident.peopleAffected} affected. Directive: ${incident.triage?.suggestedAction || 'Awaiting dispatch'}`;

      const command = new PublishCommand({
        TopicArn: CONFIG.SNS_TOPIC_ARN || undefined,
        PhoneNumber: incident.reporter?.contactMethod === 'phone' ? incident.reporter.contactValue : undefined,
        Message: smsText,
        Subject: `RescueLink Emergency ${incident.priority.toUpperCase()} Alert`,
      });

      await snsClient.send(command);
      console.log(`[NotificationService] AWS SNS SMS dispatched for incident ${incident.id}`);
      return true;
    } catch (err) {
      console.warn(`[NotificationService] AWS SNS publish failed for incident ${incident.id}:`, err);
      return false;
    }
  }

  /**
   * Send SES HTML Email alert via AWS SDK v3
   */
  private async sendSesNotification(incident: Incident): Promise<boolean> {
    try {
      const sesPkg = '@aws-sdk/client-ses';
      const { SESClient, SendEmailCommand }: any = await import(sesPkg);
      const sesClient = new SESClient({ region: CONFIG.AWS_REGION });

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 2px solid #ef4444; border-radius: 8px;">
          <h2 style="color: #ef4444;">🚨 RESCUELINK EMERGENCY ${incident.priority.toUpperCase()} ALERT</h2>
          <p><strong>Incident ID:</strong> ${incident.id}</p>
          <p><strong>Category:</strong> ${incident.category}</p>
          <p><strong>Description:</strong> ${incident.description}</p>
          <p><strong>Casualties / Affected:</strong> ${incident.peopleAffected}</p>
          <p><strong>Urgent Needs:</strong> ${incident.urgentNeeds.join(', ') || 'None'}</p>
          <p><strong>Coordinates:</strong> Lat ${incident.location.lat}, Lng ${incident.location.lng}</p>
          <hr />
          <h3>🤖 AI Triage Survival Directive</h3>
          <p style="background: #fee2e2; padding: 12px; border-left: 4px solid #ef4444; font-weight: bold;">
            ${incident.triage?.suggestedAction || 'Immediate tactical evaluation required.'}
          </p>
        </div>
      `;

      const command = new SendEmailCommand({
        Source: CONFIG.SES_FROM_EMAIL,
        Destination: {
          ToAddresses: [CONFIG.SES_ALERT_RECIPIENT],
        },
        Message: {
          Subject: {
            Data: `[RESCUELINK DISASTER ALERT] ${incident.priority.toUpperCase()}: ${incident.category}`,
          },
          Body: {
            Html: { Data: htmlBody },
          },
        },
      });

      await sesClient.send(command);
      console.log(`[NotificationService] AWS SES Email dispatched for incident ${incident.id}`);
      return true;
    } catch (err) {
      console.warn(`[NotificationService] AWS SES email failed for incident ${incident.id}:`, err);
      return false;
    }
  }

  /**
   * Formatted Local Console Mock Notification Engine
   */
  private logMockNotification(incident: Incident): void {
    const divider = '=======================================================';
    console.log(`\n${divider}`);
    console.log(`📱 [LOCAL MOCK SNS SMS ALERT] (${incident.priority.toUpperCase()})`);
    console.log(`   To: ${incident.reporter?.contactValue || 'All Response Units'}`);
    console.log(`   Message: [RESCUELINK ${incident.priority.toUpperCase()}] ${incident.category.toUpperCase()} distress alert recorded at Lat:${incident.location.lat}, Lng:${incident.location.lng}. Directive: ${incident.triage?.suggestedAction || 'Stay safe.'}`);
    console.log(`📧 [LOCAL MOCK SES EMAIL DISPATCH]`);
    console.log(`   From: ${CONFIG.SES_FROM_EMAIL} -> To: ${CONFIG.SES_ALERT_RECIPIENT}`);
    console.log(`   Subject: [RESCUELINK DISASTER ALERT] ${incident.priority.toUpperCase()}: ${incident.category}`);
    console.log(`${divider}\n`);
  }
}

export const notificationService = new NotificationService();
