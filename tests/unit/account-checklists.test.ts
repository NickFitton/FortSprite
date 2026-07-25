import { convexTest } from 'convex-test';
import { makeFunctionReference } from 'convex/server';
import { describe, expect, test, vi } from 'vitest';
import schema from '../../convex/schema';

type Status = 'not-found' | 'extracted' | 'mastered';
type Checklist = {
  progress: Record<string, Exclude<Status, 'not-found'>>;
  revision: number;
  updatedAt: number;
};

const modules = import.meta.glob('../../convex/**/*.{ts,js}');
const getChecklist = makeFunctionReference<'query', Record<string, never>, Checklist | null>(
  'checklists:get'
);
const ensureChecklist = makeFunctionReference<'mutation', Record<string, never>, Checklist>(
  'checklists:ensure'
);
const setSpriteStatus = makeFunctionReference<
  'mutation',
  { spriteId: string; status: Status },
  Checklist
>('checklists:setSpriteStatus');

function testBackend() {
  return convexTest(schema, modules);
}

function asUser(backend: ReturnType<typeof testBackend>, subject: string) {
  return backend.withIdentity({
    issuer: 'https://example.clerk.accounts.dev',
    subject,
    tokenIdentifier: `https://example.clerk.accounts.dev|${subject}`
  });
}

describe('authenticated checklist API', () => {
  test('first sign-in creates one intentionally empty revisioned checklist', async () => {
    const user = asUser(testBackend(), 'user_123');

    expect(await user.query(getChecklist, {})).toBeNull();
    await expect(user.mutation(ensureChecklist, {})).resolves.toEqual({
      progress: {},
      revision: 0,
      updatedAt: expect.any(Number)
    });

    const first = await user.query(getChecklist, {});
    const repeated = await user.mutation(ensureChecklist, {});
    expect(repeated).toEqual(first);
  });

  test('explicit upgrades, downgrades, and clears are durable and revisioned', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-25T10:00:00.000Z'));
    const user = asUser(testBackend(), 'user_123');

    await user.mutation(ensureChecklist, {});
    const extracted = await user.mutation(setSpriteStatus, {
      spriteId: 'burnt-peanut-base',
      status: 'extracted'
    });
    expect(extracted).toEqual({
      progress: { 'burnt-peanut-base': 'extracted' },
      revision: 1,
      updatedAt: Date.parse('2026-07-25T10:00:00.000Z')
    });

    vi.setSystemTime(new Date('2026-07-25T10:01:00.000Z'));
    const mastered = await user.mutation(setSpriteStatus, {
      spriteId: 'burnt-peanut-base',
      status: 'mastered'
    });
    expect(mastered.progress).toEqual({ 'burnt-peanut-base': 'mastered' });
    expect(mastered.revision).toBe(2);
    expect(mastered.updatedAt).toBe(Date.parse('2026-07-25T10:01:00.000Z'));

    const cleared = await user.mutation(setSpriteStatus, {
      spriteId: 'burnt-peanut-base',
      status: 'not-found'
    });
    expect(cleared.progress).toEqual({});
    expect(cleared.revision).toBe(3);
    expect(await user.query(getChecklist, {})).toEqual(cleared);
    vi.useRealTimers();
  });

  test('verified identities can only observe and mutate their own checklist', async () => {
    const backend = testBackend();
    const firstUser = asUser(backend, 'user_123');
    const secondUser = asUser(backend, 'user_456');

    await firstUser.mutation(setSpriteStatus, {
      spriteId: 'burnt-peanut-base',
      status: 'mastered'
    });
    await secondUser.mutation(ensureChecklist, {});

    expect((await firstUser.query(getChecklist, {}))?.progress).toEqual({
      'burnt-peanut-base': 'mastered'
    });
    expect((await secondUser.query(getChecklist, {}))?.progress).toEqual({});
    await expect(
      firstUser.mutation(setSpriteStatus, {
        spriteId: 'burnt-peanut-base',
        status: 'extracted',
        ownerId: 'user_456'
      } as never)
    ).rejects.toThrow();
  });

  test('two connected clients converge on the server-accepted write order', async () => {
    const backend = testBackend();
    const firstClient = asUser(backend, 'user_123');
    const secondClient = asUser(backend, 'user_123');

    await firstClient.mutation(setSpriteStatus, {
      spriteId: 'burnt-peanut-base',
      status: 'extracted'
    });
    expect(await secondClient.query(getChecklist, {})).toMatchObject({
      progress: { 'burnt-peanut-base': 'extracted' },
      revision: 1
    });

    await secondClient.mutation(setSpriteStatus, {
      spriteId: 'burnt-peanut-base',
      status: 'mastered'
    });
    expect(await firstClient.query(getChecklist, {})).toMatchObject({
      progress: { 'burnt-peanut-base': 'mastered' },
      revision: 2
    });
  });

  test('unauthenticated reads and writes are rejected', async () => {
    const backend = testBackend();

    await expect(backend.query(getChecklist, {})).rejects.toThrow(/sign in/i);
    await expect(backend.mutation(ensureChecklist, {})).rejects.toThrow(/sign in/i);
    await expect(
      backend.mutation(setSpriteStatus, {
        spriteId: 'burnt-peanut-base',
        status: 'extracted'
      })
    ).rejects.toThrow(/sign in/i);
  });

  test('invalid statuses and unsafe sprite identifiers are rejected', async () => {
    const user = asUser(testBackend(), 'user_123');

    await expect(
      user.mutation(setSpriteStatus, {
        spriteId: 'burnt-peanut-base',
        status: 'invented'
      } as never)
    ).rejects.toThrow();
    await expect(
      user.mutation(setSpriteStatus, {
        spriteId: 'x'.repeat(97),
        status: 'extracted'
      })
    ).rejects.toThrow(/sprite identifier/i);
  });
});
