import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export const progressStatus = v.union(
  v.literal('extracted'),
  v.literal('mastered')
);

export default defineSchema({
  accountChecklists: defineTable({
    ownerTokenIdentifier: v.string(),
    progress: v.record(v.string(), progressStatus),
    revision: v.number(),
    updatedAt: v.number()
  }).index('by_owner_token_identifier', ['ownerTokenIdentifier'])
});
