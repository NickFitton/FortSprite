import { expect, test } from '@playwright/test';

test('only sprites in the canonical availability list are selectable', async ({ page }) => {
  await page.goto('/');

  const cards = page.locator('[data-sprite-card]');
  await expect(cards).not.toHaveCount(0);
  await expect(page.locator('[data-sprite-card][data-released="false"]')).not.toHaveCount(0);
  await expect(page.locator('[data-sprite-card][data-id="duck-holofoil"]')).toHaveAttribute('role', 'group');
  await expect(page.locator('[data-sprite-card][data-id="duck-holofoil"]')).toHaveAttribute('data-released', 'false');
});

test('only listed Gem sprites are claimable', async ({ page }) => {
  await page.goto('/');

  const listedGem = page.locator('[data-sprite-card][data-id="water-gem"]');
  await expect(listedGem).toHaveAttribute('data-released', 'true');
  await expect(listedGem).toHaveAttribute('role', 'button');
  await expect(page.locator('[data-sprite-card][data-id="punk-gem"]')).toHaveAttribute('data-released', 'false');
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
