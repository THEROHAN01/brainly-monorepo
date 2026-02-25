import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  primaryKey,
  uniqueIndex,
  index,
  jsonb,
} from "drizzle-orm/pg-core";

// ── Users ──────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: varchar("username", { length: 50 }).unique(),
  email: varchar("email", { length: 255 }).unique(),
  password: text("password"),
  googleId: text("google_id").unique(),
  profilePicture: text("profile_picture"),
  authProvider: varchar("auth_provider", { length: 20 }).default("local").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ── Tags ───────────────────────────────────────────────────────────────────
export const tags = pgTable(
  "tags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("idx_tag_name_user").on(t.name, t.userId)]
);

// ── Contents ───────────────────────────────────────────────────────────────
export const contents = pgTable(
  "contents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: varchar("title", { length: 500 }).notNull(),
    link: text("link").notNull(),
    contentId: text("content_id"),
    type: varchar("type", { length: 30 }).notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Enrichment tracking
    enrichmentStatus: varchar("enrichment_status", { length: 20 }).default("pending").notNull(),
    enrichmentError: text("enrichment_error"),
    enrichmentRetries: integer("enrichment_retries").default(0).notNull(),
    enrichedAt: timestamp("enriched_at", { withTimezone: true }),

    // Metadata (flattened from MongoDB nested object)
    metaTitle: text("meta_title"),
    metaDescription: text("meta_description"),
    metaAuthor: text("meta_author"),
    metaAuthorUrl: text("meta_author_url"),
    metaThumbnail: text("meta_thumbnail"),
    metaPublishedAt: timestamp("meta_published_at", { withTimezone: true }),
    metaTags: jsonb("meta_tags").$type<string[]>(),
    metaLanguage: varchar("meta_language", { length: 10 }),
    fullText: text("full_text"),
    fullTextType: varchar("full_text_type", { length: 20 }),
    transcriptSegments: jsonb("transcript_segments").$type<
      Array<{ text: string; start: number; duration: number }>
    >(),
    providerData: jsonb("provider_data"),
    extractedAt: timestamp("extracted_at", { withTimezone: true }),
    extractorVersion: varchar("extractor_version", { length: 20 }),

    // AI fields (used in Phase 1+)
    summary: text("summary"),
    aiTags: jsonb("ai_tags").$type<string[]>(),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("idx_contents_user_created").on(t.userId, t.createdAt),
    index("idx_contents_enrichment").on(t.enrichmentStatus, t.createdAt),
  ]
);

// ── Content-Tags junction ──────────────────────────────────────────────────
export const contentTags = pgTable(
  "content_tags",
  {
    contentId: uuid("content_id")
      .notNull()
      .references(() => contents.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.contentId, t.tagId] })]
);

// ── Share Links ────────────────────────────────────────────────────────────
export const shareLinks = pgTable("share_links", {
  id: uuid("id").defaultRandom().primaryKey(),
  hash: varchar("hash", { length: 20 }).unique().notNull(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
});
