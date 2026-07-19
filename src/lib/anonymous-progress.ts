export const anonymousProgressKey = 'fortsprite:anonymous:v1';
export const legacyProgressKey = 'fortsprite:v1';

type ProgressStatus = 'extracted' | 'mastered';
export type AnonymousProgress = Record<string, ProgressStatus>;

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
