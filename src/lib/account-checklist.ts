import { $sessionStore } from '@clerk/astro/client';
import { ConvexClient } from 'convex/browser';
import { api } from '../../convex/_generated/api';

export type AccountProgress = Record<string, 'extracted' | 'mastered'>;

type AccountChecklist = {
  progress: AccountProgress;
  revision: number;
  updatedAt: number;
};

type AccountChecklistCallbacks = {
  onPending(): void;
  onReady(): void;
  onSignedOut(): void;
  onChecklist(checklist: AccountChecklist): void;
  onError(error: Error): void;
};

export type AccountChecklistConnection = {
  setSpriteStatus(spriteId: string, status: 'not-found' | 'extracted' | 'mastered'): void;
  close(): void;
};

/**
 * Connect the signed-in browser to its server-owned checklist. This deliberately
 * applies only confirmed query results, so every connected browser converges on
 * Convex's accepted write order rather than a local optimistic copy.
 */
export function connectAccountChecklist(
  callbacks: AccountChecklistCallbacks
): AccountChecklistConnection | null {
  const convexUrl = import.meta.env.PUBLIC_CONVEX_URL;
  if (!convexUrl) return null;

  const client = new ConvexClient(convexUrl);
  let stopChecklistSubscription: (() => void) | undefined;
  let ready = false;
  let initializing = false;
  let closed = false;

  function stopChecklistUpdates() {
    stopChecklistSubscription?.();
    stopChecklistSubscription = undefined;
  }

  function report(error: unknown) {
    callbacks.onError(error instanceof Error ? error : new Error(String(error)));
  }

  function startChecklistUpdates() {
    if (stopChecklistSubscription || closed) return;
    stopChecklistSubscription = client.onUpdate(
      api.checklists.get,
      {},
      (checklist) => {
        if (checklist) callbacks.onChecklist(checklist);
      },
      report
    );
  }

  const stopSessionSubscription = $sessionStore.subscribe((session) => {
    client.setAuth(async () => session?.getToken() ?? null, (isAuthenticated) => {
      if (closed) return;
      if (!isAuthenticated) {
        ready = false;
        initializing = false;
        stopChecklistUpdates();
        callbacks.onSignedOut();
        return;
      }

      if (ready || initializing) return;
      initializing = true;
      callbacks.onPending();
      void client.mutation(api.checklists.ensure, {}).then(() => {
        if (closed) return;
        initializing = false;
        ready = true;
        callbacks.onReady();
        startChecklistUpdates();
      }).catch((error) => {
        initializing = false;
        report(error);
      });
    });
  });

  return {
    setSpriteStatus(spriteId, status) {
      if (!ready || closed) return;
      void client.mutation(api.checklists.setSpriteStatus, { spriteId, status }).catch(report);
    },
    close() {
      closed = true;
      stopSessionSubscription();
      stopChecklistUpdates();
      void client.close();
    }
  };
}
