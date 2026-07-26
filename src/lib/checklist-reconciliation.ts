import type { AccountProgress } from './account-checklist';

export type ProgressStatus = 'not-found' | 'extracted' | 'mastered';

export type ReconciliationSummary = {
  anonymousCount: number;
  accountCount: number;
  anonymousOnly: string[];
  accountOnly: string[];
  anonymousHigher: string[];
  accountHigher: string[];
};

function statusRank(status: ProgressStatus): number {
  return status === 'mastered' ? 2 : status === 'extracted' ? 1 : 0;
}

export function mergeProgress(account: AccountProgress, anonymous: AccountProgress): AccountProgress {
  const merged: AccountProgress = { ...account };
  Object.entries(anonymous).forEach(([spriteId, anonymousStatus]) => {
    const accountStatus = merged[spriteId] ?? 'not-found';
    if (statusRank(anonymousStatus) > statusRank(accountStatus)) {
      merged[spriteId] = anonymousStatus;
    }
  });
  return merged;
}

export function summarizeReconciliation(
  account: AccountProgress,
  anonymous: AccountProgress
): ReconciliationSummary {
  const summary: ReconciliationSummary = {
    anonymousCount: Object.keys(anonymous).length,
    accountCount: Object.keys(account).length,
    anonymousOnly: [],
    accountOnly: [],
    anonymousHigher: [],
    accountHigher: []
  };

  Object.keys(anonymous).forEach((spriteId) => {
    const accountStatus = account[spriteId];
    if (!accountStatus) {
      summary.anonymousOnly.push(spriteId);
    } else if (statusRank(anonymous[spriteId]) > statusRank(accountStatus)) {
      summary.anonymousHigher.push(spriteId);
    } else if (statusRank(accountStatus) > statusRank(anonymous[spriteId])) {
      summary.accountHigher.push(spriteId);
    }
  });
  Object.keys(account).forEach((spriteId) => {
    if (!anonymous[spriteId]) summary.accountOnly.push(spriteId);
  });
  return summary;
}
