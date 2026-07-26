import { expect, test } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import type { AccountChecklist, AccountChecklistCallbacks } from '../../src/lib/account-checklist';

const screenshots = {
  anonymous: fileURLToPath(new URL('../../docs/user-stories/signed-in-anonymous-sync/01-anonymous-checklist.png', import.meta.url)),
  comparison: fileURLToPath(new URL('../../docs/user-stories/signed-in-anonymous-sync/02-sync-comparison.png', import.meta.url)),
  merged: fileURLToPath(new URL('../../docs/user-stories/signed-in-anonymous-sync/03-merged-account-checklist.png', import.meta.url)),
  cancelled: fileURLToPath(new URL('../../docs/user-stories/signed-in-anonymous-sync/04-cancelled-sign-in.png', import.meta.url))
};

declare global {
  interface Window {
    __fortspriteTestConnectAccountChecklist?: (
      callbacks: AccountChecklistCallbacks
    ) => {
      setSpriteStatus(): void;
      reset(): void;
      reconcile(progress: AccountChecklist['progress'], expectedRevision: number | null): void;
      close(): void;
    };
    __anonymousSyncStory?: {
      signIn(): void;
      signOut(): void;
      writes: unknown[];
    };
  }
}

test.describe('user story: reconcile an anonymous checklist after sign-in', () => {
  test('a player reviews and merges their browser collection into their signed-in checklist', async ({ page }) => {
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
      let callbacks: AccountChecklistCallbacks;
      let signedIn = false;
      const story = {
        writes: [] as unknown[],
        signIn() {
          signedIn = true;
          callbacks.onAuthenticated?.('user_123');
          callbacks.onPending();
          callbacks.onChecklist(account);
        },
        signOut() {
          signedIn = false;
          callbacks.onSignedOut();
        }
      };
      window.__anonymousSyncStory = story;
      window.__fortspriteTestConnectAccountChecklist = (nextCallbacks) => {
        callbacks = nextCallbacks;
        queueMicrotask(() => callbacks.onSignedOut());
        return {
          setSpriteStatus() {},
          reset() {},
          reconcile(progress, expectedRevision) {
            story.writes.push({ progress, expectedRevision });
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

    await page.setViewportSize({ width: 1440, height: 1080 });
    await page.goto('/');
    await expect(page.locator('[data-sprite-card][data-id="burnt-peanut-base"]'))
      .toHaveAttribute('data-status', 'mastered');
    await page.screenshot({ path: screenshots.anonymous, fullPage: true });

    await page.evaluate(() => window.__anonymousSyncStory?.signIn());
    const dialog = page.getByRole('dialog', { name: 'Choose how to sync your checklist' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Merge preview');
    await expect(dialog).toContainText('Add to account');
    await expect(dialog).toContainText('Upgrade account');
    await dialog.screenshot({ path: screenshots.comparison });

    await dialog.getByRole('button', { name: 'Merge progress' }).click();
    await expect.poll(() => page.evaluate(() => window.__anonymousSyncStory?.writes)).toEqual([{
      expectedRevision: account.revision,
      progress: {
        'burnt-peanut-base': 'mastered',
        'anonymous-only-sprite': 'extracted',
        'temporarily-absent-sprite': 'mastered'
      }
    }]);
    await expect(dialog).toBeHidden();
    await expect(page.locator('[data-sprite-card][data-id="burnt-peanut-base"]'))
      .toHaveAttribute('data-status', 'mastered');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('fortsprite:anonymous:v1')))
      .toBe(JSON.stringify(anonymous));
    await page.screenshot({ path: screenshots.merged, fullPage: true });
  });

  test('a player can cancel reconciliation and keep anonymous browser progress', async ({ page }) => {
    const anonymous = { 'burnt-peanut-base': 'mastered' } satisfies AccountChecklist['progress'];
    await page.addInitScript((progress) => {
      localStorage.setItem('fortsprite:anonymous:v1', JSON.stringify(progress));
      let callbacks: AccountChecklistCallbacks;
      const story = {
        writes: [] as unknown[],
        signIn() {
          callbacks.onAuthenticated?.('user_123');
          callbacks.onPending();
          callbacks.onChecklist(null);
        },
        signOut() { callbacks.onSignedOut(); }
      };
      window.__anonymousSyncStory = story;
      window.__fortspriteTestConnectAccountChecklist = (nextCallbacks) => {
        callbacks = nextCallbacks;
        queueMicrotask(() => callbacks.onSignedOut());
        return {
          setSpriteStatus() {},
          reset() {},
          reconcile(...args) { story.writes.push(args); },
          close() {}
        };
      };
      window.Clerk = { signOut: async () => story.signOut() } as typeof window.Clerk;
    }, anonymous);

    await page.setViewportSize({ width: 1440, height: 1080 });
    await page.goto('/');
    await page.evaluate(() => window.__anonymousSyncStory?.signIn());
    const dialog = page.getByRole('dialog', { name: 'Choose how to sync your checklist' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel and sign out' }).click();
    await expect(dialog).toBeHidden();
    await expect.poll(() => page.evaluate(() => window.__anonymousSyncStory?.writes)).toEqual([]);
    await expect.poll(() => page.evaluate(() => localStorage.getItem('fortsprite:anonymous:v1')))
      .toBe(JSON.stringify(anonymous));
    await page.screenshot({ path: screenshots.cancelled, fullPage: true });
  });
});
