CREATE TABLE "telemetry"."gateway_request_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "request_id" text NOT NULL,
  "method" text NOT NULL,
  "path" text NOT NULL,
  "path_pattern" text,
  "route_id" text,
  "service_key" text,
  "action_key" text,
  "status_code" integer NOT NULL,
  "duration_ms" integer NOT NULL,
  "workspace_id" text,
  "user_id" text,
  "client_ip_hash" text,
  "geo_country" text,
  "geo_region" text,
  "geo_city" text,
  "geo_source" text,
  "device_type" text,
  "device_browser" text,
  "device_os" text,
  "user_agent" text,
  "error_code" text,
  "request_snippet" text,
  "response_snippet" text,
  "request_size_bytes" integer,
  "response_size_bytes" integer,
  "occurred_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX "gateway_request_logs_occurred_idx"
  ON "telemetry"."gateway_request_logs" USING btree ("occurred_at");
CREATE INDEX "gateway_request_logs_workspace_occurred_idx"
  ON "telemetry"."gateway_request_logs" USING btree ("workspace_id","occurred_at");
CREATE INDEX "gateway_request_logs_status_occurred_idx"
  ON "telemetry"."gateway_request_logs" USING btree ("status_code","occurred_at");
CREATE INDEX "gateway_request_logs_route_occurred_idx"
  ON "telemetry"."gateway_request_logs" USING btree ("route_id","occurred_at");

CREATE OR REPLACE VIEW "telemetry"."v_gateway_request_logs" AS
SELECT
  "id",
  "request_id",
  "method",
  "path",
  "path_pattern",
  "route_id",
  "service_key",
  "action_key",
  "status_code",
  "duration_ms",
  "workspace_id",
  "user_id",
  "client_ip_hash",
  "geo_country",
  "geo_region",
  "geo_city",
  "geo_source",
  "device_type",
  "device_browser",
  "device_os",
  "user_agent",
  "error_code",
  "request_snippet",
  "response_snippet",
  "request_size_bytes",
  "response_size_bytes",
  "occurred_at",
  "created_at"
FROM "telemetry"."gateway_request_logs";
