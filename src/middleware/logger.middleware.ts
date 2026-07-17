import type { Context, Next } from "hono";

const ACCESS_LOG_SKIP_PATHS = new Set(["/health", "/ready"]);

export async function loggerMiddleware(
  c: Context,
  next: Next,
): Promise<void | Response> {
  if (ACCESS_LOG_SKIP_PATHS.has(c.req.path)) {
    return next();
  }

  const start = Date.now();
  const method = c.req.method;
  const path = c.req.path;

  console.log(`--> ${method} ${path}`);

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;

  console.log(`<-- ${method} ${path} ${status} ${duration}ms`);
}
