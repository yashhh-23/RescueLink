export const CONFIG = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3001,
  NODE_ENV: process.env.NODE_ENV || 'development',
  AWS_REGION: process.env.AWS_REGION || 'us-east-1',
  DYNAMODB_TABLE_INCIDENTS: process.env.DYNAMODB_TABLE_INCIDENTS || 'rescue-incidents',
  USE_LOCAL_MOCK_STORE: process.env.USE_LOCAL_MOCK_STORE !== 'false',
};
