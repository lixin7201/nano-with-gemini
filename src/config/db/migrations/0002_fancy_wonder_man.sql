CREATE TABLE "showcase" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text,
	"prompt" text NOT NULL,
	"image" text NOT NULL,
	"tags" text,
	"source" text DEFAULT 'user_share' NOT NULL,
	"is_pinned" boolean DEFAULT false,
	"sort" integer DEFAULT 0,
	"status" text DEFAULT 'published' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "showcase" ADD CONSTRAINT "showcase_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_showcase_status_pinned_created" ON "showcase" USING btree ("status","is_pinned","created_at");--> statement-breakpoint
CREATE INDEX "idx_showcase_user" ON "showcase" USING btree ("user_id");