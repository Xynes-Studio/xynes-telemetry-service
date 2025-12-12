import { vi } from 'vitest';

// Prefer real environment when provided; otherwise stub for unit tests
if (!process.env.DATABASE_URL) {
  vi.stubEnv('DATABASE_URL', 'postgresql://test:test@localhost:5432/test');
}
if (!process.env.PORT) {
  vi.stubEnv('PORT', '3000');
}
if (!process.env.NODE_ENV) {
  vi.stubEnv('NODE_ENV', 'test');
}
