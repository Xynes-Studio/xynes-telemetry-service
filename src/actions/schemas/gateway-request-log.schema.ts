import { z } from "zod";

const MAX_SNIPPET_LENGTH = 2048;
const MAX_UA_LENGTH = 256;
const MAX_TEXT_LENGTH = 512;
const RAW_IP_KEY_PATTERN = /\b(rawip|clientip|x-forwarded-for)\b/i;
const RAW_IPV4_PATTERN =
  /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/;
const RAW_IPV6_PATTERN = /\b(?:[a-f0-9]{1,4}:){2,}[a-f0-9]{1,4}\b/i;

function containsRawIpSignal(value: {
  requestSnippet?: string;
  responseSnippet?: string;
}): boolean {
  const snippets = [value.requestSnippet, value.responseSnippet].filter(
    (snippet): snippet is string => typeof snippet === "string",
  );
  return snippets.some(
    (snippet) =>
      RAW_IP_KEY_PATTERN.test(snippet) ||
      RAW_IPV4_PATTERN.test(snippet) ||
      RAW_IPV6_PATTERN.test(snippet),
  );
}

export const gatewayRequestLogGeoSchema = z
  .object({
    country: z.string().min(1).max(8).optional(),
    region: z.string().min(1).max(64).optional(),
    city: z.string().min(1).max(64).optional(),
    source: z
      .enum(["cf", "vercel", "appengine", "local-db", "unknown"])
      .optional(),
  })
  .strict()
  .optional();

export const gatewayRequestLogDeviceSchema = z
  .object({
    type: z
      .enum(["desktop", "mobile", "tablet", "bot", "unknown"])
      .optional(),
    browser: z.string().min(1).max(64).optional(),
    os: z.string().min(1).max(64).optional(),
  })
  .strict()
  .optional();

export const gatewayRequestLogPayloadSchema = z
  .object({
    requestId: z.string().min(1).max(128),
    timestamp: z.string().datetime(),
    method: z.string().min(1).max(16),
    path: z.string().min(1),
    pathPattern: z.string().max(256).nullable().optional(),
    routeId: z.string().max(128).nullable().optional(),
    serviceKey: z.string().max(128).nullable().optional(),
    actionKey: z.string().max(256).nullable().optional(),
    statusCode: z.number().int().min(100).max(599),
    durationMs: z.number().int().min(0),
    workspaceId: z.string().max(128).nullable().optional(),
    userId: z.string().max(128).nullable().optional(),
    clientIpHash: z
      .string()
      .min(8)
      .max(128)
      .regex(/^[a-f0-9]{8,128}$/i, "clientIpHash must be a hash")
      .optional(),
    userAgent: z.string().max(MAX_UA_LENGTH).optional(),
    errorCode: z.string().max(64).nullable().optional(),
    requestSnippet: z.string().max(MAX_SNIPPET_LENGTH).optional(),
    responseSnippet: z.string().max(MAX_SNIPPET_LENGTH).optional(),
    requestSizeBytes: z.number().int().min(0).nullable().optional(),
    responseSizeBytes: z.number().int().min(0).nullable().optional(),
    geo: gatewayRequestLogGeoSchema,
    device: gatewayRequestLogDeviceSchema,
  })
  .strict()
  .refine(
    (value) => !containsRawIpSignal(value),
    {
      message: "Raw IP values are not allowed in gateway access logs",
      path: ["clientIpHash"],
    },
  )
  .refine((value) => !value.path.includes("?") && !value.path.includes("#"), {
    message: "Path must not contain query string or hash",
    path: ["path"],
  })
  .refine(
    (value) =>
      !value.requestSnippet ||
      !/authorization|x-internal-service-token|set-cookie/i.test(
        value.requestSnippet,
      ),
    {
      message: "requestSnippet contains forbidden sensitive content",
      path: ["requestSnippet"],
    },
  )
  .refine(
    (value) =>
      !value.responseSnippet ||
      !/authorization|x-internal-service-token|set-cookie/i.test(
        value.responseSnippet,
      ),
    {
      message: "responseSnippet contains forbidden sensitive content",
      path: ["responseSnippet"],
    },
  );

export const gatewayRequestLogResultSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.date(),
});

export type GatewayRequestLogPayload = z.infer<
  typeof gatewayRequestLogPayloadSchema
>;
export type GatewayRequestLogResult = z.infer<
  typeof gatewayRequestLogResultSchema
>;

export const gatewayRequestLogTextFieldSchema = z.string().max(MAX_TEXT_LENGTH);
