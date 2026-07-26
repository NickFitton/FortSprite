export const anonymousProgressKey = 'fortsprite:anonymous:v1';
export const legacyProgressKey = 'fortsprite:v1';
const reconciliationDecisionVersion = 'v1';

type ProgressStatus = 'extracted' | 'mastered';
export type AnonymousProgress = Record<string, ProgressStatus>;

type ReconciliationDecision = {
  anonymousFingerprint: string;
};

function anonymousProgressFingerprint(progress: AnonymousProgress): string {
  return JSON.stringify(Object.entries(progress).sort(([first], [second]) => first.localeCompare(second)));
}

function reconciliationDecisionKey(userId: string): string {
  return `fortsprite:reconciliation:${userId}:${reconciliationDecisionVersion}`;
}

function parseProgress(value: string | null, recognizedIds?: ReadonlySet<string>): AnonymousProgress {
  if (!value) return {};

  try {
    const candidate = JSON.parse(value);
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return {};

    return Object.fromEntries(
      Object.entries(candidate).filter(([id, status]) => (
        (!recognizedIds || recognizedIds.has(id)) && (status === 'extracted' || status === 'mastered')
      ))
    ) as AnonymousProgress;
  } catch {
    return {};
  }
}

export function saveAnonymousProgress(progress: AnonymousProgress): void {
  localStorage.setItem(anonymousProgressKey, JSON.stringify(progress));
}

export function loadAnonymousProgress(recognizedIds: ReadonlySet<string>): AnonymousProgress {
  const storedProgress = localStorage.getItem(anonymousProgressKey);
  if (storedProgress !== null) return parseProgress(storedProgress);

  const legacyProgress = localStorage.getItem(legacyProgressKey);
  if (legacyProgress === null) return {};

  const migratedProgress = parseProgress(legacyProgress, recognizedIds);
  try {
    saveAnonymousProgress(migratedProgress);
    localStorage.removeItem(legacyProgressKey);
  } catch {
    // Keep the legacy source intact so migration can be retried later.
  }
  return migratedProgress;
}

/**
 * A decision belongs to one signed-in account and one exact anonymous dataset.
 * Changing either the user or local progress asks for confirmation again.
 */
export function hasAcknowledgedAnonymousReconciliation(
  userId: string,
  progress: AnonymousProgress
): boolean {
  try {
    const value = localStorage.getItem(reconciliationDecisionKey(userId));
    if (!value) return false;
    const decision = JSON.parse(value) as Partial<ReconciliationDecision>;
    return decision.anonymousFingerprint === anonymousProgressFingerprint(progress);
  } catch {
    return false;
  }
}

export function acknowledgeAnonymousReconciliation(
  userId: string,
  progress: AnonymousProgress
): void {
  try {
    const decision: ReconciliationDecision = {
      anonymousFingerprint: anonymousProgressFingerprint(progress)
    };
    localStorage.setItem(reconciliationDecisionKey(userId), JSON.stringify(decision));
  } catch {
    // Reconciliation remains safe when browser storage is unavailable; it will ask again next time.
  }
}
