export const config = {
  database: {
    url: process.env.DATABASE_URL || '',
  },
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
  },
  env: process.env.NODE_ENV || 'development',
} as const;

export function validateConfig(): void {
  if (!config.database.url) {
    throw new Error('DATABASE_URL environment variable is required');
  }
}
