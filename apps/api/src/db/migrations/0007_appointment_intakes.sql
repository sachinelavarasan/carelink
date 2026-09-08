DO $$ BEGIN
 CREATE TYPE "public"."intake_severity" AS ENUM('MILD', 'MODERATE', 'SEVERE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "appointment_intakes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appointment_id" uuid NOT NULL,
	"chief_complaint" text NOT NULL,
	"symptoms_started" text,
	"severity" "intake_severity",
	"current_medications" text,
	"allergies" text,
	"additional_notes" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "appointment_intakes_appointment_id_unique" UNIQUE("appointment_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointment_intakes" ADD CONSTRAINT "appointment_intakes_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
