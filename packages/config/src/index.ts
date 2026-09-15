export const CONFIG = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3001,
  NODE_ENV: process.env.NODE_ENV || 'development',
  AWS_REGION: process.env.AWS_REGION || 'us-east-1',
  DYNAMODB_TABLE_INCIDENTS: process.env.DYNAMODB_TABLE_INCIDENTS || 'rescue-incidents',
  USE_LOCAL_MOCK_STORE: process.env.USE_LOCAL_MOCK_STORE !== 'false',
  BEDROCK_MODEL_ID: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-haiku-20240307-v1:0',
  STATE_MACHINE_ARN: process.env.STATE_MACHINE_ARN || '',
  SNS_TOPIC_ARN: process.env.SNS_TOPIC_ARN || '',
  SES_FROM_EMAIL: process.env.SES_FROM_EMAIL || 'alerts@rescuelink.org',
  SES_ALERT_RECIPIENT: process.env.SES_ALERT_RECIPIENT || 'responders@rescuelink.org',
};
