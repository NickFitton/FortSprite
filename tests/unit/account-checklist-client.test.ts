import { afterEach, describe, expect, test, vi } from 'vitest';

const testState = vi.hoisted(() => ({
  clients: [] as FakeConvexClient[],
  getToken: vi.fn(() => Promise.resolve('clerk-token'))
}));

class FakeConvexClient {
  mutationCalls: Array<{ args: unknown }> = [];
  checklistUpdate: ((checklist: unknown) => void) | undefined;
  fetchToken: (() => Promise<string | null>) | undefined;

  constructor() {
    testState.clients.push(this);
  }

  setAuth(fetchToken: () => Promise<string | null>, onChange: (authenticated: boolean) => void) {
    this.fetchToken = fetchToken;
    onChange(true);
  }

  mutation(_reference: unknown, args: unknown) {
    this.mutationCalls.push({ args });
    return Promise.resolve({ progress: {}, revision: 0, updatedAt: 1_753_440_000_000 });
  }

  onUpdate(
    _reference: unknown,
    _args: unknown,
    onUpdate: (checklist: unknown) => void
  ) {
    this.checklistUpdate = onUpdate;
    return () => undefined;
  }

  close() {
    return Promise.resolve();
  }
}

vi.mock('convex/browser', () => ({ ConvexClient: FakeConvexClient }));
vi.mock('@clerk/astro/client', () => ({
  $sessionStore: {
    subscribe(callback: (session: {
      user: { id: string };
      getToken(options?: { template?: string }): Promise<string>;
    }) => void) {
      callback({ user: { id: 'user_123' }, getToken: testState.getToken });
      return () => undefined;
    }
  }
}));

afterEach(() => {
  testState.clients.length = 0;
  testState.getToken.mockClear();
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('signed-in account checklist client', () => {
  test('two browser connections render the same confirmed live update', async () => {
    vi.stubEnv('PUBLIC_CONVEX_URL', 'https://mossy-tiger-123.convex.cloud');
    const { connectAccountChecklist } = await import('../../src/lib/account-checklist');
    const firstClientUpdates: unknown[] = [];
    const secondClientUpdates: unknown[] = [];
    const callbacks = (updates: unknown[]) => ({
      onPending: vi.fn(),
      onReady: vi.fn(),
      onSignedOut: vi.fn(),
      onChecklist: (checklist: unknown) => updates.push(checklist),
      onError: vi.fn()
    });

    const first = connectAccountChecklist(callbacks(firstClientUpdates));
    const second = connectAccountChecklist(callbacks(secondClientUpdates));
    await flushPromises();

    expect(testState.clients).toHaveLength(2);
    await testState.clients[0].fetchToken?.();
    await testState.clients[1].fetchToken?.();
    expect(testState.getToken).toHaveBeenCalledWith({ template: 'convex' });
    expect(testState.clients[0].mutationCalls).toEqual([{ args: {} }]);
    expect(testState.clients[1].mutationCalls).toEqual([{ args: {} }]);
    expect(firstClientUpdates).toEqual([{ progress: {}, revision: 0, updatedAt: 1_753_440_000_000 }]);
    expect(secondClientUpdates).toEqual([{ progress: {}, revision: 0, updatedAt: 1_753_440_000_000 }]);
    firstClientUpdates.length = 0;
    secondClientUpdates.length = 0;

    const confirmedChecklist = {
      progress: { 'burnt-peanut-base': 'mastered' },
      revision: 2,
      updatedAt: 1_753_440_000_000
    };
    testState.clients[0].checklistUpdate?.(confirmedChecklist);
    testState.clients[1].checklistUpdate?.(confirmedChecklist);

    expect(firstClientUpdates).toEqual([confirmedChecklist]);
    expect(secondClientUpdates).toEqual([confirmedChecklist]);

    first?.setSpriteStatus('burnt-peanut-base', 'not-found');
    expect(testState.clients[0].mutationCalls.at(-1)).toEqual({
      args: { spriteId: 'burnt-peanut-base', status: 'not-found' }
    });
    first?.close();
    second?.close();
  });
});
