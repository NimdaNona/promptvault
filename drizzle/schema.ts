import { pgTable, foreignKey, unique, uuid, text, timestamp, integer, index, jsonb, boolean, varchar, real } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const shares = pgTable("shares", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	promptId: uuid("prompt_id").notNull(),
	sharedBy: text("shared_by").notNull(),
	shareCode: text("share_code").notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	viewCount: integer("view_count").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.promptId],
			foreignColumns: [prompts.id],
			name: "shares_prompt_id_prompts_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.sharedBy],
			foreignColumns: [users.id],
			name: "shares_shared_by_users_id_fk"
		}),
	unique("shares_share_code_unique").on(table.shareCode),
	unique("share_code_idx").on(table.shareCode),
]);

export const promptVersions = pgTable("prompt_versions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	promptId: uuid("prompt_id").notNull(),
	version: integer().notNull(),
	content: text().notNull(),
	metadata: jsonb(),
	changeMessage: text("change_message"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	createdBy: text("created_by").notNull(),
}, (table) => [
	index("version_prompt_id_idx").using("btree", table.promptId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.promptId],
			foreignColumns: [prompts.id],
			name: "prompt_versions_prompt_id_prompts_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "prompt_versions_created_by_users_id_fk"
		}),
	unique("prompt_version_unique").on(table.promptId, table.version),
]);

export const prompts = pgTable("prompts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	name: text().notNull(),
	description: text(),
	content: text().notNull(),
	model: text().default('gpt-4'),
	isPublic: boolean("is_public").default(false).notNull(),
	folder: text(),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("prompt_folder_idx").using("btree", table.folder.asc().nullsLast().op("text_ops")),
	index("prompt_public_idx").using("btree", table.isPublic.asc().nullsLast().op("bool_ops")),
	index("prompt_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "prompts_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const tags = pgTable("tags", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	userId: text("user_id").notNull(),
	color: varchar({ length: 7 }).default('#3B82F6'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "tags_user_id_users_id_fk"
		}).onDelete("cascade"),
	unique("user_tag_unique").on(table.name, table.userId),
]);

export const promptTags = pgTable("prompt_tags", {
	promptId: uuid("prompt_id").notNull(),
	tagId: uuid("tag_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.promptId],
			foreignColumns: [prompts.id],
			name: "prompt_tags_prompt_id_prompts_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.tagId],
			foreignColumns: [tags.id],
			name: "prompt_tags_tag_id_tags_id_fk"
		}).onDelete("cascade"),
	unique("prompt_tag_primary").on(table.promptId, table.tagId),
]);

export const users = pgTable("users", {
	id: text().primaryKey().notNull(),
	email: text().notNull(),
	name: text(),
	tier: text().default('free').notNull(),
	promptCount: integer("prompt_count").default(0).notNull(),
	stripeCustomerId: text("stripe_customer_id"),
	stripeSubscriptionId: text("stripe_subscription_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("user_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
	unique("users_email_unique").on(table.email),
]);

export const teamInvites = pgTable("team_invites", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	invitedBy: text("invited_by").notNull(),
	invitedEmail: text("invited_email").notNull(),
	role: text().default('viewer').notNull(),
	accepted: boolean().default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
}, (table) => [
	index("invite_email_idx").using("btree", table.invitedEmail.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.invitedBy],
			foreignColumns: [users.id],
			name: "team_invites_invited_by_users_id_fk"
		}),
]);

export const importSessions = pgTable("import_sessions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	source: text().notNull(),
	importedCount: integer("imported_count").default(0),
	skippedCount: integer("skipped_count").default(0),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	status: text().default('pending'),
	processedCount: integer("processed_count").default(0),
	totalCount: integer("total_count").default(0),
	error: text(),
	results: jsonb(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("import_sessions_source_idx").using("btree", table.source.asc().nullsLast().op("text_ops")),
	index("import_sessions_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("import_sessions_updated_at_idx").using("btree", table.updatedAt.asc().nullsLast().op("timestamp_ops")),
	index("import_sessions_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "import_sessions_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const promptOptimizations = pgTable("prompt_optimizations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	promptId: uuid("prompt_id").notNull(),
	originalContent: text("original_content").notNull(),
	optimizedContent: text("optimized_content").notNull(),
	improvements: jsonb(),
	scoreBefore: real("score_before"),
	scoreAfter: real("score_after"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("prompt_optimizations_prompt_id_idx").using("btree", table.promptId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.promptId],
			foreignColumns: [prompts.id],
			name: "prompt_optimizations_prompt_id_prompts_id_fk"
		}).onDelete("cascade"),
]);

export const promptTemplates = pgTable("prompt_templates", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	category: text().notNull(),
	name: text().notNull(),
	description: text(),
	content: text().notNull(),
	variables: jsonb(),
	usageCount: integer("usage_count").default(0),
	rating: real(),
	isOfficial: boolean("is_official").default(false),
	createdBy: text("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("prompt_templates_category_idx").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("prompt_templates_official_idx").using("btree", table.isOfficial.asc().nullsLast().op("bool_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "prompt_templates_created_by_users_id_fk"
		}).onDelete("set null"),
]);
