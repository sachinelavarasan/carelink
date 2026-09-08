CREATE TABLE IF NOT EXISTS "patient_vitals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"weight_kg" double precision,
	"systolic" integer,
	"diastolic" integer,
	"heart_rate" integer,
	"blood_sugar_mg_dl" double precision,
	"temperature_c" double precision,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patient_vitals" ADD CONSTRAINT "patient_vitals_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_vitals_patient_recorded_idx" ON "patient_vitals" USING btree ("patient_id","recorded_at");