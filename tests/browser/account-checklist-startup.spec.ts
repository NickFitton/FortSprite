import { expect, test, type Page } from '@playwright/test';
import type {
  AccountChecklist,
  AccountChecklistCallbacks,
  AccountChecklistDependencies
} from '../../src/lib/account-checklist';

const userId = 'user_123';
const cacheKey = `fortsprite:account:${userId}:v1`;
const anonymousKey = 'fortsprite:anonymous:v1';
const cachedChecklist = {
  progress: { 'burnt-peanut-base': 'mastered' },
  revision: 2,
  updatedAt: 1_753_440_000_000
} satisfies AccountChecklist;
const freshChecklist = {
  progress: { 'burnt-peanut-base': 'extracted' },
  revision: 0,
  updatedAt: 1_753_440_000_100
} satisfies AccountChecklist;
const resetChecklist = {
  progress: {},
  revision: 3,
  updatedAt: 1_753_440_000_200
} satisfies AccountChecklist;

declare global {
  interface Window {
    __accountChecklistStartup: {
      calls: unknown[];
      events: AccountChecklist[];
      pending: number;
      ready: number;
      resolveNext(checklist: AccountChecklist): void;
      setSpriteStatus(): void;
      reset(): void;
    };
  }
}

async function connectTestChecklist(
  page: Page,
  cache: AccountChecklist | null
) {
  await page.goto('/');
  await page.evaluate(async ({ cache, cacheKey, userId }) => {
    if (cache) localStorage.setItem(cacheKey, JSON.stringify(cache));
    const moduleUrl = '/src/lib/account-checklist.ts';
    const { createAccountChecklistConnection } = await import(/* @vite-ignore */ moduleUrl) as typeof import('../../src/lib/account-checklist');
    const resolvers: Array<(checklist: AccountChecklist) => void> = [];
    const calls: unknown[] = [];
    const events: AccountChecklist[] = [];
    let pending = 0;
    let ready = 0;
    const callbacks: AccountChecklistCallbacks = {
      onPending() { pending += 1; },
      onReady() { ready += 1; },
      onSignedOut() {},
      onChecklist(checklist) { if (checklist) events.push(checklist); },
      onError(error) { throw error; }
    };
    const dependencies: AccountChecklistDependencies = {
      createClient() {
        return {
          setAuth(_getToken, onChange) { onChange(true); },
          query() { return Promise.resolve(null); },
          mutation(_reference, args) {
            calls.push(args);
            return new Promise<AccountChecklist>((resolve) => resolvers.push(resolve));
          },
          onUpdate() { return () => {}; },
          close() { return Promise.resolve(); }
        };
      },
      subscribeSession(callback) {
        callback({ user: { id: userId }, getToken: async () => 'clerk-token' });
        return () => {};
      }
    };
    const connection = createAccountChecklistConnection(callbacks, dependencies);
    window.__accountChecklistStartup = {
      calls,
      events,
      get pending() { return pending; },
      get ready() { return ready; },
      resolveNext(checklist) { resolvers.shift()?.(checklist); },
      setSpriteStatus() { connection.setSpriteStatus('burnt-peanut-base', 'extracted'); },
      reset() { connection.reset(); }
    };
  }, { cache, cacheKey, userId });
}

test('returning startup renders its matching account cache before server validation', async ({ page }) => {
  await connectTestChecklist(page, cachedChecklist);

  await expect.poll(() => page.evaluate(() => window.__accountChecklistStartup.events))
    .toEqual([cachedChecklist]);
  await expect.poll(() => page.evaluate(() => window.__accountChecklistStartup.pending)).toBe(1);
  await expect.poll(() => page.evaluate(() => window.__accountChecklistStartup.ready)).toBe(0);
  await page.evaluate(() => window.__accountChecklistStartup.setSpriteStatus());
  await expect.poll(() => page.evaluate(() => window.__accountChecklistStartup.calls)).toEqual([{}]);

  await page.evaluate((checklist) => window.__accountChecklistStartup.resolveNext(checklist), cachedChecklist);
  await expect.poll(() => page.evaluate(() => window.__accountChecklistStartup.ready)).toBe(1);
});

test('fresh startup waits for a confirmed account checklist before rendering', async ({ page }) => {
  await connectTestChecklist(page, null);

  await expect.poll(() => page.evaluate(() => window.__accountChecklistStartup.events)).toEqual([]);
  await page.evaluate((checklist) => window.__accountChecklistStartup.resolveNext(checklist), freshChecklist);

  await expect.poll(() => page.evaluate(() => window.__accountChecklistStartup.events))
    .toEqual([freshChecklist]);
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), cacheKey))
    .toBe(JSON.stringify(freshChecklist));
});

test('stale account cache is replaced by the confirmed server checklist', async ({ page }) => {
  await connectTestChecklist(page, cachedChecklist);
  const currentChecklist = { ...freshChecklist, revision: 4 };

  await page.evaluate((checklist) => window.__accountChecklistStartup.resolveNext(checklist), currentChecklist);

  await expect.poll(() => page.evaluate(() => window.__accountChecklistStartup.events))
    .toEqual([cachedChecklist, currentChecklist]);
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), cacheKey))
    .toBe(JSON.stringify(currentChecklist));
});

test('reset updates only the confirmed account cache', async ({ page }) => {
  await connectTestChecklist(page, cachedChecklist);
  const anonymousProgress = { 'burnt-peanut-base': 'extracted' };
  await page.evaluate(({ key, progress }) => localStorage.setItem(key, JSON.stringify(progress)), {
    key: anonymousKey,
    progress: anonymousProgress
  });
  await page.evaluate((checklist) => window.__accountChecklistStartup.resolveNext(checklist), cachedChecklist);
  await expect.poll(() => page.evaluate(() => window.__accountChecklistStartup.ready)).toBe(1);

  await page.evaluate(() => window.__accountChecklistStartup.reset());
  await expect.poll(() => page.evaluate(() => window.__accountChecklistStartup.calls)).toEqual([{}, {}]);
  await page.evaluate((checklist) => window.__accountChecklistStartup.resolveNext(checklist), resetChecklist);

  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), cacheKey))
    .toBe(JSON.stringify(resetChecklist));
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), anonymousKey))
    .toBe(JSON.stringify(anonymousProgress));
});
