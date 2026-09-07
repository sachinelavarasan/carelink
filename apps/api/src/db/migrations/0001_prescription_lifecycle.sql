ALTER TABLE "prescription_items" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "finalized_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "symptoms" text;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "notes" text;