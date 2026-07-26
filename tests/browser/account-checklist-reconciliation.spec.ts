import { expect, test, type Page } from '@playwright/test';
import type {
  AccountChecklist,
  AccountChecklistCallbacks,
  AccountChecklistDependencies
} from '../../src/lib/account-checklist';

const anonymousProgress = { 'burnt-peanut-base': 'mastered' } satisfies AccountChecklist['progress'];
const accountChecklist = {
  progress: { 'burnt-peanut-base': 'extracted', 'temporarily-absent-sprite': 'mastered' },
  revision: 3,
  updatedAt: 1_753_440_000_000
} satisfies AccountChecklist;

declare global {
  interface Window {
    __accountChecklistReconciliation: {
      calls: unknown[];
      checklists: Array<AccountChecklist | null>;
      pending: number;
      ready: number;
      signedOut: number;
      resolveRead(checklist: AccountChecklist | null): void;
      resolveWrite(checklist: AccountChecklist): void;
      rejectWrite(message: string): void;
      merge(progress: AccountChecklist['progress'], expectedRevision: number | null): void;
      signOut(): void;
    };
    __fortspriteTestConnectAccountChecklist?: (
      callbacks: AccountChecklistCallbacks
    ) => {
      setSpriteStatus(): void;
      reset(): void;
      reconcile(progress: AccountChecklist['progress'], expectedRevision: number | null): void;
      close(): void;
    };
    __fortspritePromptTest?: {
      writes: unknown[];
      signOuts: number;
    };
  }
}

async function connectReconciliation(page: Page) {
  await page.goto('/');
  await page.evaluate(async () => {
    const moduleUrl = '/src/lib/account-checklist.ts';
    const { createAccountChecklistConnection } = await import(/* @vite-ignore */ moduleUrl) as typeof import('../../src/lib/account-checklist');
    const readResolvers: Array<(checklist: AccountChecklist | null) => void> = [];
    const writeResolvers: Array<(checklist: AccountChecklist) => void> = [];
    const writeRejectors: Array<(error: Error) => void> = [];
    const calls: unknown[] = [];
    const checklists: Array<AccountChecklist | null> = [];
    let pending = 0;
    let ready = 0;
    let signedOut = 0;
    let sessionCallback: ((nextSession: { user: { id: string }; getToken: () => Promise<string> } | undefined) => void) | undefined;
    let session: { user: { id: string }; getToken: () => Promise<string> } | undefined = {
      user: { id: 'user_123' },
      getToken: async () => 'clerk-token'
    };
    const callbacks: AccountChecklistCallbacks = {
      onPending() { pending += 1; },
      onReady() { ready += 1; },
      onSignedOut() { signedOut += 1; },
      onChecklist(checklist) { checklists.push(checklist); },
      onError(error) { throw error; }
    };
    const dependencies: AccountChecklistDependencies = {
      createClient() {
        return {
          setAuth(_getToken, onChange) { onChange(Boolean(session?.user)); },
          query() {
            return new Promise<AccountChecklist | null>((resolve) => readResolvers.push(resolve));
          },
          mutation(_reference, args) {
            calls.push(args);
            return new Promise<AccountChecklist>((resolve, reject) => {
              writeResolvers.push(resolve);
              writeRejectors.push(reject);
            });
          },
          onUpdate() { return () => {}; },
          close() { return Promise.resolve(); }
        };
      },
      subscribeSession(callback) {
        sessionCallback = callback;
        callback(session);
        return () => {};
      }
    };
    const connection = createAccountChecklistConnection(callbacks, dependencies, {
      reconcileAnonymousProgress: true
    });
    window.__accountChecklistReconciliation = {
      calls,
      checklists,
      get pending() { return pending; },
      get ready() { return ready; },
      get signedOut() { return signedOut; },
      resolveRead(checklist) { readResolvers.shift()?.(checklist); },
      resolveWrite(checklist) { writeResolvers.shift()?.(checklist); },
      rejectWrite(message) { writeRejectors.shift()?.(new Error(message)); },
      merge(progress, expectedRevision) {
        connection.reconcile(progress, expectedRevision);
      },
      signOut() {
        session = undefined;
        sessionCallback?.(session);
      }
    };
  });
}

test('meaningful anonymous progress waits for a signed-in reconciliation decision, even for a new account', async ({ page }) => {
  await connectReconciliation(page);

  await expect.poll(() => page.evaluate(() => window.__accountChecklistReconciliation.pending)).toBe(1);
  await expect.poll(() => page.evaluate(() => window.__accountChecklistReconciliation.calls)).toEqual([]);
  await page.evaluate(() => window.__accountChecklistReconciliation.resolveRead(null));
  await expect.poll(() => page.evaluate(() => window.__accountChecklistReconciliation.checklists)).toEqual([null]);
  await expect.poll(() => page.evaluate(() => window.__accountChecklistReconciliation.ready)).toBe(0);
});

const reconciliationSnapshots: Array<[string, AccountChecklist]> = [
  ['empty', { progress: {}, revision: 0, updatedAt: 1 }],
  ['equal', { progress: anonymousProgress, revision: 1, updatedAt: 2 }],
  ['subset', { progress: { 'burnt-peanut-base': 'extracted' }, revision: 2, updatedAt: 3 }],
  ['divergent', { progress: { 'burnt-peanut-base': 'extracted', 'temporarily-absent-sprite': 'mastered' }, revision: 3, updatedAt: 4 }]
];

for (const [name, checklist] of reconciliationSnapshots) {
  test(`${name} account data remains an inspectable reconciliation decision`, async ({ page }) => {
    await connectReconciliation(page);
    await page.evaluate((next) => window.__accountChecklistReconciliation.resolveRead(next), checklist);
    await expect.poll(() => page.evaluate(() => window.__accountChecklistReconciliation.checklists))
      .toEqual([checklist]);
    await expect.poll(() => page.evaluate(() => window.__accountChecklistReconciliation.calls)).toEqual([]);
    await expect.poll(() => page.evaluate(() => window.__accountChecklistReconciliation.ready)).toBe(0);
  });
}

test('merging writes the inspected revision and leaves the anonymous browser data alone', async ({ page }) => {
  await connectReconciliation(page);
  await page.evaluate((checklist) => window.__accountChecklistReconciliation.resolveRead(checklist), accountChecklist);
  await expect.poll(() => page.evaluate(() => window.__accountChecklistReconciliation.checklists))
    .toEqual([accountChecklist]);
  await page.evaluate((progress) => localStorage.setItem('fortsprite:anonymous:v1', JSON.stringify(progress)), anonymousProgress);

  await page.evaluate(({ progress, revision }) => window.__accountChecklistReconciliation.merge(progress, revision), {
    progress: anonymousProgress,
    revision: accountChecklist.revision
  });
  await expect.poll(() => page.evaluate(() => window.__accountChecklistReconciliation.calls)).toEqual([{
    expectedRevision: accountChecklist.revision,
    progress: anonymousProgress
  }]);
  await page.evaluate((checklist) => window.__accountChecklistReconciliation.resolveWrite(checklist), {
    ...accountChecklist,
    progress: { ...accountChecklist.progress, ...anonymousProgress } as AccountChecklist['progress'],
    revision: accountChecklist.revision + 1
  });
  await expect.poll(() => page.evaluate(() => window.__accountChecklistReconciliation.ready)).toBe(1);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('fortsprite:anonymous:v1')))
    .toBe(JSON.stringify(anonymousProgress));
});

test('cancelling before reconciliation signs out without writing either checklist', async ({ page }) => {
  await connectReconciliation(page);
  await page.evaluate((progress) => localStorage.setItem('fortsprite:anonymous:v1', JSON.stringify(progress)), anonymousProgress);
  await page.evaluate((checklist) => window.__accountChecklistReconciliation.resolveRead(checklist), accountChecklist);
  await page.evaluate(() => window.__accountChecklistReconciliation.signOut());

  await expect.poll(() => page.evaluate(() => window.__accountChecklistReconciliation.signedOut)).toBe(1);
  await expect.poll(() => page.evaluate(() => window.__accountChecklistReconciliation.calls)).toEqual([]);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('fortsprite:anonymous:v1')))
    .toBe(JSON.stringify(anonymousProgress));
});

test('a stale reconciliation reloads the account checklist for a new decision', async ({ page }) => {
  await connectReconciliation(page);
  await page.evaluate((checklist) => window.__accountChecklistReconciliation.resolveRead(checklist), accountChecklist);
  await page.evaluate(({ progress, revision }) => window.__accountChecklistReconciliation.merge(progress, revision), {
    progress: anonymousProgress,
    revision: accountChecklist.revision
  });
  await page.evaluate(() => window.__accountChecklistReconciliation.rejectWrite('The account checklist is stale.'));
  const refreshed = { ...accountChecklist, revision: 4 };
  await page.evaluate((checklist) => window.__accountChecklistReconciliation.resolveRead(checklist), refreshed);

  await expect.poll(() => page.evaluate(() => window.__accountChecklistReconciliation.checklists))
    .toEqual([accountChecklist, refreshed]);
  await expect.poll(() => page.evaluate(() => window.__accountChecklistReconciliation.ready)).toBe(0);
});

test('signed-in anonymous data prompt compares both checklists and merges only after approval', async ({ page }) => {
  const anonymous = {
    'burnt-peanut-base': 'mastered',
    'anonymous-only-sprite': 'extracted'
  } satisfies AccountChecklist['progress'];
  const account = {
    progress: {
      'burnt-peanut-base': 'extracted',
      'temporarily-absent-sprite': 'mastered'
    },
    revision: 7,
    updatedAt: 1
  } satisfies AccountChecklist;
  await page.addInitScript(({ anonymous, account }) => {
    localStorage.setItem('fortsprite:anonymous:v1', JSON.stringify(anonymous));
    const promptTest: { writes: unknown[]; signOuts: number } = { writes: [], signOuts: 0 };
    window.__fortspritePromptTest = promptTest;
    window.__fortspriteTestConnectAccountChecklist = (callbacks) => {
      queueMicrotask(() => {
        callbacks.onPending();
        callbacks.onChecklist(account);
      });
      return {
        setSpriteStatus() {},
        reset() {},
        reconcile(progress, expectedRevision) {
          promptTest.writes.push({ progress, expectedRevision });
          callbacks.onPending();
          queueMicrotask(() => {
            callbacks.onChecklist({ ...account, progress, revision: account.revision + 1 });
            callbacks.onReady();
          });
        },
        close() {}
      };
    };
  }, { anonymous, account });

  await page.goto('/');
  const dialog = page.getByRole('dialog', { name: 'Choose how to sync your checklist' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Anonymous browser saved sprites');
  await expect(dialog).toContainText('Signed-in account saved sprites');
  await expect(dialog).toContainText('Merge preview');
  await expect(dialog).toContainText('Add to account');
  await expect(dialog).toContainText('Upgrade account');
  await expect(dialog.getByRole('img', { name: 'Burnt Peanut Sprite' })).toBeVisible();

  await dialog.getByRole('button', { name: 'Merge progress' }).click();
  await expect.poll(() => page.evaluate(() => window.__fortspritePromptTest?.writes)).toEqual([{
    expectedRevision: account.revision,
    progress: {
      'burnt-peanut-base': 'mastered',
      'anonymous-only-sprite': 'extracted',
      'temporarily-absent-sprite': 'mastered'
    }
  }]);
  await expect(dialog).toBeHidden();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('fortsprite:anonymous:v1')))
    .toBe(JSON.stringify(anonymous));
});

test('the sync prompt cancel action signs out without writing progress', async ({ page }) => {
  const anonymous = { 'burnt-peanut-base': 'mastered' } satisfies AccountChecklist['progress'];
  await page.addInitScript((progress) => {
    localStorage.setItem('fortsprite:anonymous:v1', JSON.stringify(progress));
    const promptTest: { writes: unknown[]; signOuts: number } = { writes: [], signOuts: 0 };
    let callbacks: AccountChecklistCallbacks;
    window.__fortspritePromptTest = promptTest;
    window.__fortspriteTestConnectAccountChecklist = (nextCallbacks) => {
      callbacks = nextCallbacks;
      queueMicrotask(() => {
        callbacks.onPending();
        callbacks.onChecklist(null);
      });
      return {
        setSpriteStatus() {},
        reset() {},
        reconcile(...args) { promptTest.writes.push(args); },
        close() {}
      };
    };
    window.Clerk = {
      signOut: async () => {
        promptTest.signOuts += 1;
        callbacks.onSignedOut();
      }
    } as typeof window.Clerk;
  }, anonymous);

  await page.goto('/');
  const dialog = page.getByRole('dialog', { name: 'Choose how to sync your checklist' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel and sign out' }).click();

  await expect.poll(() => page.evaluate(() => window.__fortspritePromptTest)).toEqual({ writes: [], signOuts: 1 });
  await expect(dialog).toBeHidden();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('fortsprite:anonymous:v1')))
    .toBe(JSON.stringify(anonymous));
});

test('a new account can keep an intentionally empty checklist', async ({ page }) => {
  const anonymous = { 'burnt-peanut-base': 'mastered' } satisfies AccountChecklist['progress'];
  await page.addInitScript((progress) => {
    localStorage.setItem('fortsprite:anonymous:v1', JSON.stringify(progress));
    const promptTest: { writes: unknown[]; signOuts: number } = { writes: [], signOuts: 0 };
    window.__fortspritePromptTest = promptTest;
    window.__fortspriteTestConnectAccountChecklist = (callbacks) => {
      queueMicrotask(() => {
        callbacks.onPending();
        callbacks.onChecklist(null);
      });
      return {
        setSpriteStatus() {},
        reset() {},
        reconcile(nextProgress, expectedRevision) {
          promptTest.writes.push({ progress: nextProgress, expectedRevision });
          queueMicrotask(() => {
            callbacks.onChecklist({ progress: nextProgress, revision: 0, updatedAt: 1 });
            callbacks.onReady();
          });
        },
        close() {}
      };
    };
  }, anonymous);

  await page.goto('/');
  const dialog = page.getByRole('dialog', { name: 'Choose how to sync your checklist' });
  await dialog.getByRole('button', { name: 'Use account checklist' }).click();

  await expect.poll(() => page.evaluate(() => window.__fortspritePromptTest?.writes)).toEqual([{
    expectedRevision: null,
    progress: {}
  }]);
  await expect(dialog).toBeHidden();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('fortsprite:anonymous:v1')))
    .toBe(JSON.stringify(anonymous));
});
