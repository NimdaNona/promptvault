import { pgTable, serial, text, timestamp, jsonb, integer, boolean, uuid, varchar, index, unique, real } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table (managed by Clerk, but we keep a reference)
export const users = pgTable('users', {
  id: text('id').primaryKey(), // Clerk user ID
  email: text('email').notNull().unique(),
  name: text('name'),
  tier: text('tier').notNull().default('free'), // free, pro, enterprise
  promptCount: integer('prompt_count').notNull().default(0),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => {
  return {
    emailIdx: index('user_email_idx').on(table.email),
  };
});

// Prompts table
export const prompts = pgTable('prompts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  content: text('content').notNull(),
  model: text('model').default('gpt-4'), // gpt-4, claude, gemini, etc.
  isPublic: boolean('is_public').notNull().default(false),
  folder: text('folder'), // folder path like "marketing/social"
  metadata: jsonb('metadata'), // additional data like temperature, max_tokens, etc.
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => {
  return {
    userIdIdx: index('prompt_user_id_idx').on(table.userId),
    folderIdx: index('prompt_folder_idx').on(table.folder),
    publicIdx: index('prompt_public_idx').on(table.isPublic),
  };
});

// Prompt versions table (for version history)
export const promptVersions = pgTable('prompt_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  promptId: uuid('prompt_id').notNull().references(() => prompts.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  content: text('content').notNull(),
  metadata: jsonb('metadata'),
  changeMessage: text('change_message'), // commit message
  createdAt: timestamp('created_at').notNull().defaultNow(),
  createdBy: text('created_by').notNull().references(() => users.id),
}, (table) => {
  return {
    promptIdIdx: index('version_prompt_id_idx').on(table.promptId),
    promptVersionUnique: unique('prompt_version_unique').on(table.promptId, table.version),
  };
});

// Tags table
export const tags = pgTable('tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  color: varchar('color', { length: 7 }).default('#3B82F6'), // hex color
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => {
  return {
    userTagUnique: unique('user_tag_unique').on(table.userId, table.name),
  };
});

// Prompt-Tags junction table
export const promptTags = pgTable('prompt_tags', {
  promptId: uuid('prompt_id').notNull().references(() => prompts.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (table) => {
  return {
    promptTagPrimary: unique('prompt_tag_primary').on(table.promptId, table.tagId),
  };
});

// Shares table (for sharing prompts)
export const shares = pgTable('shares', {
  id: uuid('id').primaryKey().defaultRandom(),
  promptId: uuid('prompt_id').notNull().references(() => prompts.id, { onDelete: 'cascade' }),
  sharedBy: text('shared_by').notNull().references(() => users.id),
  shareCode: text('share_code').notNull().unique(), // unique share link code
  expiresAt: timestamp('expires_at'),
  viewCount: integer('view_count').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => {
  return {
    shareCodeIdx: unique('share_code_idx').on(table.shareCode),
  };
});

// Team invites (for pro/enterprise users)
export const teamInvites = pgTable('team_invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  invitedBy: text('invited_by').notNull().references(() => users.id),
  invitedEmail: text('invited_email').notNull(),
  role: text('role').notNull().default('viewer'), // viewer, editor
  accepted: boolean('accepted').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
}, (table) => {
  return {
    invitedEmailIdx: index('invite_email_idx').on(table.invitedEmail),
  };
});

// Import sessions
export const importSessions = pgTable('import_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  source: text('source').notNull(), // 'chatgpt', 'claude', 'cline', 'cursor', 'gemini', 'file'
  status: text('status').default('pending'), // 'pending', 'processing', 'completed', 'failed'
  importedCount: integer('imported_count').default(0),
  skippedCount: integer('skipped_count').default(0),
  processedCount: integer('processed_count').default(0),
  totalCount: integer('total_count').default(0),
  error: text('error'),
  results: jsonb('results'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => {
  return {
    userIdIdx: index('import_sessions_user_id_idx').on(table.userId),
    sourceIdx: index('import_sessions_source_idx').on(table.source),
    statusIdx: index('import_sessions_status_idx').on(table.status),
    updatedAtIdx: index('import_sessions_updated_at_idx').on(table.updatedAt),
  };
});

// Prompt optimizations
export const promptOptimizations = pgTable('prompt_optimizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  promptId: uuid('prompt_id').notNull().references(() => prompts.id, { onDelete: 'cascade' }),
  originalContent: text('original_content').notNull(),
  optimizedContent: text('optimized_content').notNull(),
  improvements: jsonb('improvements'),
  scoreBefore: real('score_before'),
  scoreAfter: real('score_after'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => {
  return {
    promptIdIdx: index('prompt_optimizations_prompt_id_idx').on(table.promptId),
  };
});

// Prompt templates
export const promptTemplates = pgTable('prompt_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  category: text('category').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  content: text('content').notNull(),
  variables: jsonb('variables'),
  usageCount: integer('usage_count').default(0),
  rating: real('rating'),
  isOfficial: boolean('is_official').default(false),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => {
  return {
    categoryIdx: index('prompt_templates_category_idx').on(table.category),
    officialIdx: index('prompt_templates_official_idx').on(table.isOfficial),
  };
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  prompts: many(prompts),
  tags: many(tags),
  shares: many(shares),
  invites: many(teamInvites),
  importSessions: many(importSessions),
  promptTemplates: many(promptTemplates),
}));

export const promptsRelations = relations(prompts, ({ one, many }) => ({
  user: one(users, {
    fields: [prompts.userId],
    references: [users.id],
  }),
  versions: many(promptVersions),
  tags: many(promptTags),
  shares: many(shares),
  optimizations: many(promptOptimizations),
}));

export const promptVersionsRelations = relations(promptVersions, ({ one }) => ({
  prompt: one(prompts, {
    fields: [promptVersions.promptId],
    references: [prompts.id],
  }),
  createdBy: one(users, {
    fields: [promptVersions.createdBy],
    references: [users.id],
  }),
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
  user: one(users, {
    fields: [tags.userId],
    references: [users.id],
  }),
  prompts: many(promptTags),
}));

export const promptTagsRelations = relations(promptTags, ({ one }) => ({
  prompt: one(prompts, {
    fields: [promptTags.promptId],
    references: [prompts.id],
  }),
  tag: one(tags, {
    fields: [promptTags.tagId],
    references: [tags.id],
  }),
}));

export const sharesRelations = relations(shares, ({ one }) => ({
  prompt: one(prompts, {
    fields: [shares.promptId],
    references: [prompts.id],
  }),
  sharedBy: one(users, {
    fields: [shares.sharedBy],
    references: [users.id],
  }),
}));

export const teamInvitesRelations = relations(teamInvites, ({ one }) => ({
  invitedBy: one(users, {
    fields: [teamInvites.invitedBy],
    references: [users.id],
  }),
}));

export const importSessionsRelations = relations(importSessions, ({ one }) => ({
  user: one(users, {
    fields: [importSessions.userId],
    references: [users.id],
  }),
}));

export const promptOptimizationsRelations = relations(promptOptimizations, ({ one }) => ({
  prompt: one(prompts, {
    fields: [promptOptimizations.promptId],
    references: [prompts.id],
  }),
}));

export const promptTemplatesRelations = relations(promptTemplates, ({ one }) => ({
  createdBy: one(users, {
    fields: [promptTemplates.createdBy],
    references: [users.id],
  }),
}));