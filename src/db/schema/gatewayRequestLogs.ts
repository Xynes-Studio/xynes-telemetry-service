import {
  uuid,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { telemetrySchema } from "./events";

export const gatewayRequestLogs = telemetrySchema.table(
  "gateway_request_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: text("request_id").notNull(),
    method: text("method").notNull(),
    path: text("path").notNull(),
    pathPattern: text("path_pattern"),
    routeId: text("route_id"),
    serviceKey: text("service_key"),
    actionKey: text("action_key"),
    statusCode: integer("status_code").notNull(),
    durationMs: integer("duration_ms").notNull(),
    workspaceId: text("workspace_id"),
    userId: text("user_id"),
    clientIpHash: text("client_ip_hash"),
    geoCountry: text("geo_country"),
    geoRegion: text("geo_region"),
    geoCity: text("geo_city"),
    geoSource: text("geo_source"),
    deviceType: text("device_type"),
    deviceBrowser: text("device_browser"),
    deviceOs: text("device_os"),
    userAgent: text("user_agent"),
    errorCode: text("error_code"),
    requestSnippet: text("request_snippet"),
    responseSnippet: text("response_snippet"),
    requestSizeBytes: integer("request_size_bytes"),
    responseSizeBytes: integer("response_size_bytes"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("gateway_request_logs_occurred_idx").on(table.occurredAt),
    index("gateway_request_logs_workspace_occurred_idx").on(
      table.workspaceId,
      table.occurredAt,
    ),
    index("gateway_request_logs_status_occurred_idx").on(
      table.statusCode,
      table.occurredAt,
    ),
    index("gateway_request_logs_route_occurred_idx").on(
      table.routeId,
      table.occurredAt,
    ),
  ],
);

export type GatewayRequestLog = typeof gatewayRequestLogs.$inferSelect;
export type NewGatewayRequestLog = typeof gatewayRequestLogs.$inferInsert;
