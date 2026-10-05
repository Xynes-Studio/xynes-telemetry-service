import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { INTERNAL_REQUEST_RECEIVERS } from '../../src/infra/security/internal-request';

test('receiver capabilities match the production registration catalog', () => {
  const source = readFileSync(new URL('../../src/actions/index.ts', import.meta.url), 'utf8');
  const registered = Array.from(source.matchAll(/registerTelemetryAction\(\s*['"]([^'"]+)['"]/g), match => match[1]).sort();
  expect(registered.length).toBeGreaterThan(0);
  expect([...INTERNAL_REQUEST_RECEIVERS['telemetry-service'].operations].sort()).toEqual(registered);
});
