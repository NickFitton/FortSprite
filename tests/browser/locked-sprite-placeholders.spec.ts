import { expect, test } from '@playwright/test';

test('all known sprite variants are claimable', async ({ page }) => {
  await page.goto('/');

  const cards = page.locator('[data-sprite-card]');
  await expect(cards).not.toHaveCount(0);
  await expect(page.locator('[data-sprite-card][data-released="false"]')).toHaveCount(0);
});

test('Gem sprites are claimable', async ({ page }) => {
  await page.goto('/');

  const gemCards = page.locator('[data-sprite-card][data-variant="Gem"]');
  await expect(gemCards).not.toHaveCount(0);
  expect(await gemCards.evaluateAll((cards) =>
    cards.every((card) => card.getAttribute('data-released') === 'true' && card.getAttribute('role') === 'button')
  )).toBe(true);
});

test('lists the available Holofoil Grim Sprite as claimable', async ({ page }) => {
  await page.goto('/');

  const grimHolofoil = page.locator('[data-sprite-card][data-id="grim-holofoil"]');
  await expect(grimHolofoil).toHaveAttribute('data-released', 'true');
  await expect(grimHolofoil).toHaveAttribute('data-exact-image', 'true');
  await expect(grimHolofoil).toHaveAttribute('role', 'button');
  await expect(grimHolofoil.locator('img')).toHaveAttribute('src', '/sprites/T_Icon_BR_GrimReaper_Holofoil_L.webp');
  await expect(grimHolofoil.getByText('None', { exact: true })).toBeVisible();
});
