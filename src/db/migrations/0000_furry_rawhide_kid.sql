CREATE SCHEMA "telemetry";
--> statement-breakpoint
CREATE TABLE "telemetry"."events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid,
	"user_id" uuid,
	"source" text NOT NULL,
	"event_type" text NOT NULL,
	"name" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "events_workspace_created_idx" ON "telemetry"."events" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "events_type_name_idx" ON "telemetry"."events" USING btree ("event_type","name");