import { vi } from 'vitest';

// Mock environment variables
vi.stubEnv('DATABASE_URL', 'postgresql://test:test@localhost:5432/test');
vi.stubEnv('PORT', '3000');
vi.stubEnv('NODE_ENV', 'test');
