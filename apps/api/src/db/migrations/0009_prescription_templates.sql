CREATE TABLE IF NOT EXISTS "prescription_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doctor_id" uuid NOT NULL,
	"name" text NOT NULL,
	"symptoms" text,
	"diagnosis" text,
	"advice" text,
	"follow_up_days" integer,
	"drug_category_flags" text[] DEFAULT '{}' NOT NULL,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "prescription_templates" ADD CONSTRAINT "prescription_templates_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prescription_templates_doctor_idx" ON "prescription_templates" USING btree ("doctor_id");