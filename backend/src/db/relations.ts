import { relations } from "drizzle-orm";
import { users, tags, contents, contentTags, shareLinks } from "./schema";

export const usersRelations = relations(users, ({ many, one }) => ({
  contents: many(contents),
  tags: many(tags),
  shareLink: one(shareLinks, { fields: [users.id], references: [shareLinks.userId] }),
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
  user: one(users, { fields: [tags.userId], references: [users.id] }),
  contentTags: many(contentTags),
}));

export const contentsRelations = relations(contents, ({ one, many }) => ({
  user: one(users, { fields: [contents.userId], references: [users.id] }),
  contentTags: many(contentTags),
}));

export const contentTagsRelations = relations(contentTags, ({ one }) => ({
  content: one(contents, {
    fields: [contentTags.contentId],
    references: [contents.id],
  }),
  tag: one(tags, {
    fields: [contentTags.tagId],
    references: [tags.id],
  }),
}));

export const shareLinksRelations = relations(shareLinks, ({ one }) => ({
  user: one(users, { fields: [shareLinks.userId], references: [users.id] }),
}));
