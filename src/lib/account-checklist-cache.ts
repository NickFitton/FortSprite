import type { AccountChecklist } from './account-checklist';

const cacheVersion = 'v1';

export function accountChecklistCacheKey(userId: string): string {
  return `fortsprite:account:${userId}:${cacheVersion}`;
}

function isChecklist(value: unknown): value is AccountChecklist {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const checklist = value as Record<string, unknown>;
  if (
    !Number.isSafeInteger(checklist.revision) ||
    (checklist.revision as number) < 0 ||
    typeof checklist.updatedAt !== 'number' ||
    !Number.isFinite(checklist.updatedAt) ||
    !checklist.progress ||
    typeof checklist.progress !== 'object' ||
    Array.isArray(checklist.progress)
  ) {
    return false;
  }

  return Object.values(checklist.progress).every(
    (status) => status === 'extracted' || status === 'mastered'
  );
}

export function loadAccountChecklistCache(userId: string): AccountChecklist | null {
  try {
    const cached = localStorage.getItem(accountChecklistCacheKey(userId));
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    return isChecklist(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveAccountChecklistCache(userId: string, checklist: AccountChecklist): void {
  try {
    localStorage.setItem(accountChecklistCacheKey(userId), JSON.stringify(checklist));
  } catch {
    // The server remains authoritative if browser storage is unavailable.
  }
}
