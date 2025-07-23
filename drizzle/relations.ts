import { relations } from "drizzle-orm/relations";
import { prompts, shares, users, promptVersions, tags, promptTags, teamInvites, importSessions, promptOptimizations, promptTemplates } from "./schema";

export const sharesRelations = relations(shares, ({one}) => ({
	prompt: one(prompts, {
		fields: [shares.promptId],
		references: [prompts.id]
	}),
	user: one(users, {
		fields: [shares.sharedBy],
		references: [users.id]
	}),
}));

export const promptsRelations = relations(prompts, ({one, many}) => ({
	shares: many(shares),
	promptVersions: many(promptVersions),
	user: one(users, {
		fields: [prompts.userId],
		references: [users.id]
	}),
	promptTags: many(promptTags),
	promptOptimizations: many(promptOptimizations),
}));

export const usersRelations = relations(users, ({many}) => ({
	shares: many(shares),
	promptVersions: many(promptVersions),
	prompts: many(prompts),
	tags: many(tags),
	teamInvites: many(teamInvites),
	importSessions: many(importSessions),
	promptTemplates: many(promptTemplates),
}));

export const promptVersionsRelations = relations(promptVersions, ({one}) => ({
	prompt: one(prompts, {
		fields: [promptVersions.promptId],
		references: [prompts.id]
	}),
	user: one(users, {
		fields: [promptVersions.createdBy],
		references: [users.id]
	}),
}));

export const tagsRelations = relations(tags, ({one, many}) => ({
	user: one(users, {
		fields: [tags.userId],
		references: [users.id]
	}),
	promptTags: many(promptTags),
}));

export const promptTagsRelations = relations(promptTags, ({one}) => ({
	prompt: one(prompts, {
		fields: [promptTags.promptId],
		references: [prompts.id]
	}),
	tag: one(tags, {
		fields: [promptTags.tagId],
		references: [tags.id]
	}),
}));

export const teamInvitesRelations = relations(teamInvites, ({one}) => ({
	user: one(users, {
		fields: [teamInvites.invitedBy],
		references: [users.id]
	}),
}));

export const importSessionsRelations = relations(importSessions, ({one}) => ({
	user: one(users, {
		fields: [importSessions.userId],
		references: [users.id]
	}),
}));

export const promptOptimizationsRelations = relations(promptOptimizations, ({one}) => ({
	prompt: one(prompts, {
		fields: [promptOptimizations.promptId],
		references: [prompts.id]
	}),
}));

export const promptTemplatesRelations = relations(promptTemplates, ({one}) => ({
	user: one(users, {
		fields: [promptTemplates.createdBy],
		references: [users.id]
	}),
}));