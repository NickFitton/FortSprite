import { afterEach, describe, expect, test, vi } from 'vitest';

const testState = vi.hoisted(() => ({
  clients: [] as FakeConvexClient[]
}));

class FakeConvexClient {
  mutationCalls: Array<{ args: unknown }> = [];
  checklistUpdate: ((checklist: unknown) => void) | undefined;

  constructor() {
    testState.clients.push(this);
  }

  setAuth(_fetchToken: unknown, onChange: (authenticated: boolean) => void) {
    onChange(true);
  }

  mutation(_reference: unknown, args: unknown) {
    this.mutationCalls.push({ args });
    return Promise.resolve({});
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
    subscribe(callback: (session: { getToken(): Promise<string> }) => void) {
      callback({ getToken: () => Promise.resolve('clerk-token') });
      return () => undefined;
    }
  }
}));

afterEach(() => {
  testState.clients.length = 0;
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
    expect(testState.clients[0].mutationCalls).toEqual([{ args: {} }]);
    expect(testState.clients[1].mutationCalls).toEqual([{ args: {} }]);

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
