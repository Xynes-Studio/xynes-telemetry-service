import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';

const BUN_ALPINE_IMAGE =
  'oven/bun:1-alpine@sha256:5acc90a93e91ff07bf72aa90a7c9f0fa189765aec90b47bdbf2152d2196383c0';

describe('H-6 production image contract', () => {
  it('ships a non-root telemetry runtime with healthcheck and migrations', async () => {
    const dockerfile = await readFile('Dockerfile', 'utf8');
    const packageJson = JSON.parse(await readFile('package.json', 'utf8')) as {
      scripts: Record<string, string>;
    };
    const dockerignore = await readFile('.dockerignore', 'utf8').catch(() => '');

    expect(dockerfile).toContain(`FROM ${BUN_ALPINE_IMAGE} AS base`);
    expect(dockerfile).toContain('FROM base AS dev');
    expect(dockerfile).toContain(`FROM ${BUN_ALPINE_IMAGE} AS prod`);
    expect(dockerfile).toContain('COPY src ./src');
    expect(dockerfile).toContain('addgroup -S -g 1001 xynes');
    expect(dockerfile).toContain('adduser -S -u 1001 -G xynes -H xynes');
    expect(dockerfile).toContain('bun install --production --frozen-lockfile');
    expect(dockerfile).toContain('--omit peer');
    expect(dockerfile).toContain('ENV PORT=4400');
    expect(dockerfile).toContain('USER xynes');
    expect(dockerfile).toContain('EXPOSE 4400');
    expect(dockerfile).toContain(
      'HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD bun run healthcheck || exit 1',
    );
    expect(dockerfile).toContain('CMD ["bun", "run", "src/index.ts"]');

    expect(packageJson.scripts.healthcheck).toContain('127.0.0.1');
    expect(packageJson.scripts.healthcheck).toContain('process.env.PORT||4400');
    expect(packageJson.scripts.healthcheck).toContain('/health');

    const ignoredPaths = dockerignore.split(/\r?\n/);
    expect(ignoredPaths).not.toContain('src');
    expect(ignoredPaths).not.toContain('src/db/migrations');
    expect(ignoredPaths).not.toContain('src/db/migrations/');
  });
});