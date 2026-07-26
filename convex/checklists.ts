import { ConvexError, v } from 'convex/values';
import type { Doc } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { mutation, query } from './_generated/server';
import { progressStatus } from './schema';

const desiredStatus = v.union(v.literal('not-found'), progressStatus);
const progress = v.record(v.string(), progressStatus);
const publicChecklist = v.object({
  progress,
  revision: v.number(),
  updatedAt: v.number()
});
const MAX_SPRITE_ID_LENGTH = 96;
const MAX_PROGRESS_ENTRIES = 512;
const spriteIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type ChecklistContext = Pick<QueryCtx, 'auth' | 'db'> | Pick<MutationCtx, 'auth' | 'db'>;
type PublicChecklist = {
  progress: Record<string, 'extracted' | 'mastered'>;
  revision: number;
  updatedAt: number;
};

async function requireOwnerTokenIdentifier(ctx: ChecklistContext): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError('You must sign in to access an account checklist.');
  }
  return identity.tokenIdentifier;
}

async function findOwnedChecklist(
  ctx: ChecklistContext,
  ownerTokenIdentifier: string
): Promise<Doc<'accountChecklists'> | null> {
  return ctx.db
    .query('accountChecklists')
    .withIndex('by_owner_token_identifier', (index) =>
      index.eq('ownerTokenIdentifier', ownerTokenIdentifier)
    )
    .unique();
}

function toPublicChecklist(checklist: Doc<'accountChecklists'>): PublicChecklist {
  return {
    progress: checklist.progress,
    revision: checklist.revision,
    updatedAt: checklist.updatedAt
  };
}

function validateSpriteId(spriteId: string): void {
  if (
    spriteId.length === 0 ||
    spriteId.length > MAX_SPRITE_ID_LENGTH ||
    !spriteIdPattern.test(spriteId)
  ) {
    throw new ConvexError('The sprite identifier is invalid or unsafe.');
  }
}

function validateProgress(nextProgress: Record<string, 'extracted' | 'mastered'>): void {
  if (Object.keys(nextProgress).length > MAX_PROGRESS_ENTRIES) {
    throw new ConvexError('The checklist has reached its safe size limit.');
  }
  Object.keys(nextProgress).forEach(validateSpriteId);
}

export const get = query({
  args: {},
  returns: v.union(publicChecklist, v.null()),
  handler: async (ctx) => {
    const ownerTokenIdentifier = await requireOwnerTokenIdentifier(ctx);
    const checklist = await findOwnedChecklist(ctx, ownerTokenIdentifier);
    return checklist ? toPublicChecklist(checklist) : null;
  }
});

export const ensure = mutation({
  args: {},
  returns: publicChecklist,
  handler: async (ctx) => {
    const ownerTokenIdentifier = await requireOwnerTokenIdentifier(ctx);
    const existing = await findOwnedChecklist(ctx, ownerTokenIdentifier);
    if (existing) return toPublicChecklist(existing);

    const checklistId = await ctx.db.insert('accountChecklists', {
      ownerTokenIdentifier,
      progress: {},
      revision: 0,
      updatedAt: Date.now()
    });
    const checklist = await ctx.db.get(checklistId);
    if (!checklist) throw new ConvexError('Could not create the account checklist.');
    return toPublicChecklist(checklist);
  }
});

/**
 * Atomically accepts a user-approved reconciliation. The expected revision is
 * the exact account state the browser showed in the comparison, so a second
 * device cannot silently overwrite a newer checklist.
 */
export const reconcile = mutation({
  args: {
    progress,
    expectedRevision: v.union(v.number(), v.null())
  },
  returns: publicChecklist,
  handler: async (ctx, args) => {
    validateProgress(args.progress);
    const ownerTokenIdentifier = await requireOwnerTokenIdentifier(ctx);
    const existing = await findOwnedChecklist(ctx, ownerTokenIdentifier);
    const currentRevision = existing?.revision ?? null;
    if (currentRevision !== args.expectedRevision) {
      throw new ConvexError('The account checklist is stale because it changed while you were comparing it. Please review it again.');
    }

    const nextChecklist = {
      ownerTokenIdentifier,
      progress: args.progress,
      revision: (existing?.revision ?? -1) + 1,
      updatedAt: Date.now()
    };
    if (existing) {
      await ctx.db.patch(existing._id, nextChecklist);
    } else {
      await ctx.db.insert('accountChecklists', nextChecklist);
    }
    return {
      progress: nextChecklist.progress,
      revision: nextChecklist.revision,
      updatedAt: nextChecklist.updatedAt
    };
  }
});

export const reset = mutation({
  args: {},
  returns: publicChecklist,
  handler: async (ctx) => {
    const ownerTokenIdentifier = await requireOwnerTokenIdentifier(ctx);
    const existing = await findOwnedChecklist(ctx, ownerTokenIdentifier);
    const nextChecklist = {
      ownerTokenIdentifier,
      progress: {},
      revision: (existing?.revision ?? -1) + 1,
      updatedAt: Date.now()
    };

    if (existing) {
      await ctx.db.patch(existing._id, nextChecklist);
    } else {
      await ctx.db.insert('accountChecklists', nextChecklist);
    }
    return {
      progress: nextChecklist.progress,
      revision: nextChecklist.revision,
      updatedAt: nextChecklist.updatedAt
    };
  }
});

export const setSpriteStatus = mutation({
  args: {
    spriteId: v.string(),
    status: desiredStatus
  },
  returns: publicChecklist,
  handler: async (ctx, args) => {
    validateSpriteId(args.spriteId);
    const ownerTokenIdentifier = await requireOwnerTokenIdentifier(ctx);
    const existing = await findOwnedChecklist(ctx, ownerTokenIdentifier);
    const progress = { ...(existing?.progress ?? {}) };

    if (
      args.status !== 'not-found' &&
      !(args.spriteId in progress) &&
      Object.keys(progress).length >= MAX_PROGRESS_ENTRIES
    ) {
      throw new ConvexError('The checklist has reached its safe size limit.');
    }

    if (args.status === 'not-found') {
      delete progress[args.spriteId];
    } else {
      progress[args.spriteId] = args.status;
    }

    const nextChecklist = {
      ownerTokenIdentifier,
      progress,
      revision: (existing?.revision ?? 0) + 1,
      updatedAt: Date.now()
    };

    if (existing) {
      await ctx.db.patch(existing._id, nextChecklist);
    } else {
      await ctx.db.insert('accountChecklists', nextChecklist);
    }
    return {
      progress: nextChecklist.progress,
      revision: nextChecklist.revision,
      updatedAt: nextChecklist.updatedAt
    };
  }
});
