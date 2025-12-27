/**
 * URL sanitization helpers.
 *
 * Telemetry must not persist raw query strings since they may contain secrets.
 */

export function stripQueryFromUrlLikeString(value: string): string {
  // Root-relative path (but not protocol-relative URLs like "//example.com/...").
  if (value.startsWith('/') && !value.startsWith('//')) {
    return stripQueryAndHash(value);
  }

  // Protocol-relative URL: "//example.com/path?token=..." -> "https://example.com/path"
  const normalized = value.startsWith('//') ? `https:${value}` : value;

  // Network URLs with an explicit scheme (http(s), ws(s), ftp, etc.).
  if (/^\w+:\/\//.test(normalized)) {
    try {
      const url = new URL(normalized);
      return `${url.origin}${url.pathname}`;
    } catch {
      return stripQueryAndHash(value);
    }
  }

  return value;
}

export function sanitizeUrlQueryStringsDeep<T>(value: T): T {
  return sanitizeUnknown(value) as T;
}

const UNSAFE_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

function sanitizeUnknown(value: unknown): unknown {
  if (typeof value === 'string') {
    return stripQueryFromUrlLikeString(value);
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeUnknown);
  }

  if (value === null || typeof value !== 'object') {
    return value;
  }

  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
    return value;
  }

  // Use a regular object (instead of null-prototype) to avoid compatibility issues
  // with libraries like Drizzle that check prototype.constructor.
  // Keys like "__proto__", "prototype", "constructor" are still filtered out.
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    if (UNSAFE_KEYS.has(k)) continue;
    out[k] = sanitizeUnknown(v);
  }
  return out;
}

function stripQueryAndHash(value: string): string {
  const idx = value.search(/[?#]/);
  return idx === -1 ? value : value.slice(0, idx);
}
