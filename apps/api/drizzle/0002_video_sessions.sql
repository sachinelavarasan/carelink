CREATE TABLE IF NOT EXISTS "video_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appointment_id" uuid NOT NULL,
	"room_name" text NOT NULL,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "video_sessions_appointment_id_unique" UNIQUE("appointment_id"),
	CONSTRAINT "video_sessions_room_name_unique" UNIQUE("room_name")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "video_sessions" ADD CONSTRAINT "video_sessions_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
