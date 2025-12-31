import { z } from "zod";

/**
 * TELE-GW-1: Schema for HTTP request telemetry events from the gateway.
 *
 * Security constraints:
 * - userAgent is truncated to 256 chars max
 * - clientIpHash must be a hashed value (no raw IPs)
 * - path must not contain query strings
 */

/** Maximum length for userAgent in telemetry metadata */
export const MAX_USER_AGENT_LENGTH = 256;

/** Maximum length for error codes */
export const MAX_ERROR_CODE_LENGTH = 64;

/** Maximum length for path pattern */
export const MAX_PATH_PATTERN_LENGTH = 256;

/**
 * Meta object schema for http_request events.
 */
export const httpRequestMetaSchema = z
  .object({
    userAgent: z.string().max(MAX_USER_AGENT_LENGTH).optional(),
    errorCode: z.string().max(MAX_ERROR_CODE_LENGTH).optional(),
    pathPattern: z.string().max(MAX_PATH_PATTERN_LENGTH).optional(),
  })
  .strict();

/**
 * HTTP request telemetry event metadata schema.
 */
export const httpRequestEventSchema = z
  .object({
    type: z.literal("http_request"),
    routeId: z.string().nullable(),
    serviceKey: z.string().nullable(),
    actionKey: z.string().nullable(),
    method: z.string().min(1),
    path: z
      .string()
      .min(1)
      .refine((val) => !val.includes("?") && !val.includes("#"), {
        message: "Path must not contain query string or hash",
      }),
    statusCode: z.number().int().min(100).max(599),
    durationMs: z.number().int().min(0),
    workspaceId: z.string().uuid().nullable(),
    userId: z.string().uuid().nullable(),
    clientIpHash: z.string().max(64).optional(),
    timestamp: z.string().datetime(),
    meta: httpRequestMetaSchema,
  })
  .strict();

export type HttpRequestEvent = z.infer<typeof httpRequestEventSchema>;
export type HttpRequestMeta = z.infer<typeof httpRequestMetaSchema>;

/**
 * Validates and transforms http_request event metadata.
 * Returns the validated event or throws a ZodError.
 */
export function parseHttpRequestEvent(data: unknown): HttpRequestEvent {
  return httpRequestEventSchema.parse(data);
}

/**
 * Safely validates http_request event metadata.
 * Returns success result or error result.
 */
export function safeParseHttpRequestEvent(data: unknown) {
  return httpRequestEventSchema.safeParse(data);
}
