import { Incident, IncidentStatus, Priority } from '@rescue-link/schema';
import { CONFIG } from '@rescue-link/config';

export class DynamoIncidentStore {
  private tableName = CONFIG.DYNAMODB_TABLE_INCIDENTS;

  async create(incident: Incident): Promise<Incident> {
    const clientPkg = '@aws-sdk/client-dynamodb';
    const libPkg = '@aws-sdk/lib-dynamodb';
    const { DynamoDBClient }: any = await import(clientPkg);
    const { DynamoDBDocumentClient, PutCommand }: any = await import(libPkg);

    const client = new DynamoDBClient({ region: CONFIG.AWS_REGION });
    const docClient = DynamoDBDocumentClient.from(client);

    await docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: incident,
      })
    );

    return incident;
  }

  async getById(id: string): Promise<Incident | null> {
    const clientPkg = '@aws-sdk/client-dynamodb';
    const libPkg = '@aws-sdk/lib-dynamodb';
    const { DynamoDBClient }: any = await import(clientPkg);
    const { DynamoDBDocumentClient, GetCommand }: any = await import(libPkg);

    const client = new DynamoDBClient({ region: CONFIG.AWS_REGION });
    const docClient = DynamoDBDocumentClient.from(client);

    const res = await docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { id },
      })
    );

    return (res.Item as Incident) || null;
  }

  async list(filter?: { status?: IncidentStatus; priority?: Priority }): Promise<Incident[]> {
    const clientPkg = '@aws-sdk/client-dynamodb';
    const libPkg = '@aws-sdk/lib-dynamodb';
    const { DynamoDBClient }: any = await import(clientPkg);
    const { DynamoDBDocumentClient, ScanCommand }: any = await import(libPkg);

    const client = new DynamoDBClient({ region: CONFIG.AWS_REGION });
    const docClient = DynamoDBDocumentClient.from(client);

    const res = await docClient.send(
      new ScanCommand({
        TableName: this.tableName,
      })
    );

    let items = (res.Items as Incident[]) || [];

    if (filter?.status) {
      items = items.filter((i) => i.status === filter.status);
    }
    if (filter?.priority) {
      items = items.filter((i) => i.priority === filter.priority);
    }

    return items.sort((a, b) => b.createdAt - a.createdAt);
  }

  async update(id: string, updates: Partial<Incident>): Promise<Incident | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const updated: Incident = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    };

    await this.create(updated);
    return updated;
  }

  async clear(): Promise<void> {
    // No-op for safety in production table
  }
}
