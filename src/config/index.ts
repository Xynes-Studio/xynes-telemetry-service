export const config = {
  database: {
    url: process.env.DATABASE_URL || "",
  },
  server: {
    port: parseInt(process.env.PORT || "3000", 10),
  },
  env: process.env.NODE_ENV || "development",
} as const;

export function validateConfig(): void {
  // Check process.env directly for runtime validation (config.database.url is static at load time)
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }
}
