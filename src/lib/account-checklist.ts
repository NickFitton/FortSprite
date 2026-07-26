import { $sessionStore } from '@clerk/astro/client';
import { ConvexClient } from 'convex/browser';
import { api } from '../../convex/_generated/api';
import { loadAccountChecklistCache, saveAccountChecklistCache } from './account-checklist-cache';

export type AccountProgress = Record<string, 'extracted' | 'mastered'>;

export type AccountChecklist = {
  progress: AccountProgress;
  revision: number;
  updatedAt: number;
};

export type AccountChecklistCallbacks = {
  onPending(): void;
  onReady(): void;
  onSignedOut(): void;
  onChecklist(checklist: AccountChecklist): void;
  onError(error: Error): void;
};

export type AccountChecklistConnection = {
  setSpriteStatus(spriteId: string, status: 'not-found' | 'extracted' | 'mastered'): void;
  reset(): void;
  close(): void;
};

type AccountSession = {
  user: { id: string } | null;
  getToken(options?: { template?: string }): Promise<string | null>;
} | null | undefined;

type AccountChecklistClient = {
  setAuth(
    fetchToken: () => Promise<string | null>,
    onChange: (isAuthenticated: boolean) => void
  ): void;
  mutation(reference: unknown, args: unknown): Promise<AccountChecklist>;
  onUpdate(
    reference: unknown,
    args: unknown,
    onUpdate: (checklist: AccountChecklist | null) => void,
    onError: (error: unknown) => void
  ): () => void;
  close(): Promise<void>;
};

export type AccountChecklistDependencies = {
  createClient(): AccountChecklistClient;
  subscribeSession(callback: (session: AccountSession) => void): () => void;
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

  return createAccountChecklistConnection(callbacks, {
    createClient: () => new ConvexClient(convexUrl),
    subscribeSession: (callback) => $sessionStore.subscribe(callback)
  });
}

/**
 * The connection boundary is injectable so browser tests can exercise startup
 * behavior without relying on a real Clerk session or Convex deployment.
 */
export function createAccountChecklistConnection(
  callbacks: AccountChecklistCallbacks,
  dependencies: AccountChecklistDependencies
): AccountChecklistConnection {
  const client = dependencies.createClient();

  let stopChecklistSubscription: (() => void) | undefined;
  let ready = false;
  let initializing = false;
  let closed = false;
  let userId: string | undefined;
  let latestRevision = -1;

  function stopChecklistUpdates() {
    stopChecklistSubscription?.();
    stopChecklistSubscription = undefined;
  }

  function report(error: unknown) {
    callbacks.onError(error instanceof Error ? error : new Error(String(error)));
  }

  function acceptConfirmedChecklist(checklist: AccountChecklist, allowOlderRevision = false) {
    if (!userId || (!allowOlderRevision && checklist.revision < latestRevision)) return;
    latestRevision = checklist.revision;
    saveAccountChecklistCache(userId, checklist);
    callbacks.onChecklist(checklist);
  }

  function startChecklistUpdates() {
    if (stopChecklistSubscription || closed) return;
    stopChecklistSubscription = client.onUpdate(
      api.checklists.get,
      {},
      (checklist) => {
        if (checklist) acceptConfirmedChecklist(checklist);
      },
      report
    );
  }

  const stopSessionSubscription = dependencies.subscribeSession((session) => {
    client.setAuth(async () => session?.getToken({ template: 'convex' }) ?? null, (isAuthenticated) => {
      if (closed) return;
      const nextUserId = session?.user?.id;
      if (!isAuthenticated || !nextUserId) {
        ready = false;
        initializing = false;
        userId = undefined;
        latestRevision = -1;
        stopChecklistUpdates();
        callbacks.onSignedOut();
        return;
      }

      if (userId !== nextUserId) {
        ready = false;
        initializing = false;
        latestRevision = -1;
        stopChecklistUpdates();
        userId = nextUserId;
      }
      if (ready || initializing) return;
      initializing = true;
      callbacks.onPending();
      const cachedChecklist = loadAccountChecklistCache(nextUserId);
      if (cachedChecklist) {
        latestRevision = cachedChecklist.revision;
        callbacks.onChecklist(cachedChecklist);
      }
      void client.mutation(api.checklists.ensure, {}).then((checklist) => {
        if (closed || userId !== nextUserId) return;
        initializing = false;
        acceptConfirmedChecklist(checklist, true);
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
      void client.mutation(api.checklists.setSpriteStatus, { spriteId, status })
        .then((checklist) => acceptConfirmedChecklist(checklist))
        .catch(report);
    },
    reset() {
      if (!ready || closed) return;
      const resettingUserId = userId;
      ready = false;
      callbacks.onPending();
      void client.mutation(api.checklists.reset, {})
        .then((checklist) => {
          if (closed || userId !== resettingUserId) return;
          acceptConfirmedChecklist(checklist, true);
          ready = true;
          callbacks.onReady();
        })
        .catch((error) => {
          if (closed || userId !== resettingUserId) return;
          ready = true;
          report(error);
        });
    },
    close() {
      closed = true;
      stopSessionSubscription();
      stopChecklistUpdates();
      void client.close();
    }
  };
}
