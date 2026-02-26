export const config = {
  database: {
    url: process.env.DATABASE_URL || "",
  },
  server: {
    port: parseInt(process.env.PORT || "3000", 10),
  },
  retention: {
    gatewayLogsDays: parseInt(
      process.env.TELEMETRY_GATEWAY_LOG_RETENTION_DAYS || "180",
      10,
    ),
    runIntervalMs: parseInt(
      process.env.TELEMETRY_RETENTION_RUN_INTERVAL_MS ||
        String(24 * 60 * 60 * 1000),
      10,
    ),
  },
  env: process.env.NODE_ENV || "development",
} as const;

export function validateConfig(): void {
  // Check process.env directly for runtime validation (config.database.url is static at load time)
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }
}
