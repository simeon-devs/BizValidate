CREATE TABLE "source_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"domain" text NOT NULL,
	"label" text,
	"sector" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "source_preferences_user_domain" UNIQUE("user_id","domain")
);
--> statement-breakpoint
ALTER TABLE "source_preferences" ADD CONSTRAINT "source_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;