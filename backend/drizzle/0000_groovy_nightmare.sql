CREATE TABLE "content_tags" (
	"content_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "content_tags_content_id_tag_id_pk" PRIMARY KEY("content_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "contents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(500) NOT NULL,
	"link" text NOT NULL,
	"content_id" text,
	"type" varchar(30) NOT NULL,
	"user_id" uuid NOT NULL,
	"enrichment_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"enrichment_error" text,
	"enrichment_retries" integer DEFAULT 0 NOT NULL,
	"enriched_at" timestamp with time zone,
	"meta_title" text,
	"meta_description" text,
	"meta_author" text,
	"meta_author_url" text,
	"meta_thumbnail" text,
	"meta_published_at" timestamp with time zone,
	"meta_tags" jsonb,
	"meta_language" varchar(10),
	"full_text" text,
	"full_text_type" varchar(20),
	"transcript_segments" jsonb,
	"provider_data" jsonb,
	"extracted_at" timestamp with time zone,
	"extractor_version" varchar(20),
	"summary" text,
	"ai_tags" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "share_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hash" varchar(20) NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "share_links_hash_unique" UNIQUE("hash"),
	CONSTRAINT "share_links_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(50),
	"email" varchar(255),
	"password" text,
	"google_id" text,
	"profile_picture" text,
	"auth_provider" varchar(20) DEFAULT 'local' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_google_id_unique" UNIQUE("google_id")
);
--> statement-breakpoint
ALTER TABLE "content_tags" ADD CONSTRAINT "content_tags_content_id_contents_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."contents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_tags" ADD CONSTRAINT "content_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contents" ADD CONSTRAINT "contents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_contents_user_created" ON "contents" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_contents_enrichment" ON "contents" USING btree ("enrichment_status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_tag_name_user" ON "tags" USING btree ("name","user_id");--> statement-breakpoint
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER contents_updated_at BEFORE UPDATE ON contents
FOR EACH ROW EXECUTE FUNCTION update_updated_at();