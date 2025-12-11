import type { Context, Next } from 'hono';

export async function loggerMiddleware(c: Context, next: Next): Promise<void | Response> {
  const start = Date.now();
  const method = c.req.method;
  const path = c.req.path;

  console.log(`--> ${method} ${path}`);

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;

  console.log(`<-- ${method} ${path} ${status} ${duration}ms`);
}
