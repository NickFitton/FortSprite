import { expect, test } from '@playwright/test';

const anonymousKey = 'fortsprite:anonymous:v1';
const legacyKey = 'fortsprite:v1';
const spriteId = 'burnt-peanut-base';

test('anonymous progress persists independently in the browser', async ({ page }) => {
  await page.goto('/');
  const sprite = page.locator(`[data-sprite-card][data-id="${spriteId}"]`);

  await sprite.click();
  await expect(sprite).toHaveAttribute('data-status', 'extracted');
  await page.reload();

  await expect(sprite).toHaveAttribute('data-status', 'extracted');
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), anonymousKey))
    .toBe(JSON.stringify({ [spriteId]: 'extracted' }));
});

test('recognized legacy progress migrates once into anonymous storage', async ({ page }) => {
  await page.addInitScript(({ key, id }) => {
    localStorage.setItem(key, JSON.stringify({ [id]: 'mastered' }));
  }, { key: legacyKey, id: spriteId });

  await page.goto('/');

  await expect(page.locator(`[data-sprite-card][data-id="${spriteId}"]`))
    .toHaveAttribute('data-status', 'mastered');
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), legacyKey)).toBeNull();
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), anonymousKey))
    .toBe(JSON.stringify({ [spriteId]: 'mastered' }));
});

test('invalid statuses and unrecognized sprites are not migrated', async ({ page }) => {
  await page.addInitScript(({ key, id }) => {
    localStorage.setItem(key, JSON.stringify({
      [id]: 'invented',
      'unknown-sprite': 'mastered'
    }));
  }, { key: legacyKey, id: spriteId });

  await page.goto('/');

  await expect(page.locator(`[data-sprite-card][data-id="${spriteId}"]`))
    .toHaveAttribute('data-status', 'not-found');
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), anonymousKey))
    .toBe('{}');
});

test('malformed legacy data becomes an empty anonymous checklist', async ({ page }) => {
  await page.addInitScript((key) => localStorage.setItem(key, '{not-json'), legacyKey);

  await page.goto('/');

  await expect(page.locator(`[data-sprite-card][data-id="${spriteId}"]`))
    .toHaveAttribute('data-status', 'not-found');
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), anonymousKey))
    .toBe('{}');
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), legacyKey)).toBeNull();
});

test('keeps legacy data when replacement storage cannot be written', async ({ page }) => {
  await page.addInitScript(({ anonymousKey, legacyKey, spriteId }) => {
    localStorage.setItem(legacyKey, JSON.stringify({ [spriteId]: 'mastered' }));
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === anonymousKey) throw new DOMException('Storage full', 'QuotaExceededError');
      return originalSetItem.call(this, key, value);
    };
  }, { anonymousKey, legacyKey, spriteId });

  await page.goto('/');

  await expect(page.locator(`[data-sprite-card][data-id="${spriteId}"]`))
    .toHaveAttribute('data-status', 'mastered');
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), legacyKey))
    .toBe(JSON.stringify({ [spriteId]: 'mastered' }));
});

test('temporarily absent sprites survive ordinary anonymous edits', async ({ page }) => {
  await page.addInitScript(({ key, id }) => {
    localStorage.setItem(key, JSON.stringify({
      [id]: 'extracted',
      'temporarily-absent-sprite': 'mastered'
    }));
  }, { key: anonymousKey, id: spriteId });

  await page.goto('/');
  await page.locator(`[data-sprite-card][data-id="${spriteId}"]`).click();

  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), anonymousKey))
    .toBe(JSON.stringify({
      [spriteId]: 'mastered',
      'temporarily-absent-sprite': 'mastered'
    }));
});

test('opening authentication cannot overwrite anonymous progress', async ({ page }) => {
  await page.addInitScript(({ key, id }) => {
    localStorage.setItem(key, JSON.stringify({ [id]: 'extracted' }));
    localStorage.setItem('fortsprite:account:user_123:v1', JSON.stringify({ [id]: 'mastered' }));
  }, { key: anonymousKey, id: spriteId });

  await page.goto('/');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.locator(`[data-sprite-card][data-id="${spriteId}"]`))
    .toHaveAttribute('data-status', 'extracted');
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), anonymousKey))
    .toBe(JSON.stringify({ [spriteId]: 'extracted' }));
});
