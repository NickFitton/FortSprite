import { expect, test } from '@playwright/test';

test('locked sprites use their row base artwork as a placeholder', async ({ page }) => {
  await page.goto('/');

  const lockedImageSources = await page.locator('[data-sprite-row]').evaluateAll((rows) =>
    rows.flatMap((row) => {
      const baseImage = row.nextElementSibling?.querySelector('img')?.getAttribute('src');
      const matrix = row.parentElement;
      if (!matrix) return [];
      const start = Array.from(matrix.children).indexOf(row);
      const cells = Array.from(matrix.children).slice(start + 1, start + 9);

      return cells
        .filter((cell) => cell.getAttribute('data-released') === 'false')
        .map((cell) => ({
          baseImage,
          image: cell.querySelector('img')?.getAttribute('src')
        }));
    })
  );

  expect(lockedImageSources.length).toBeGreaterThan(0);
  expect(lockedImageSources).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ baseImage: expect.any(String), image: expect.any(String) })
    ])
  );
  for (const { baseImage, image } of lockedImageSources) {
    expect(image).toBe(baseImage);
  }
});

test('Gem sprites remain locked until the variant is released', async ({ page }) => {
  await page.goto('/');

  const gemCells = await page.locator('[data-sprite-card][data-variant="Gem"]').evaluateAll((cells) =>
    cells.map((cell) => ({
      released: cell.getAttribute('data-released'),
      status: cell.querySelector('[data-status-badge]')?.textContent?.trim()
    }))
  );

  expect(gemCells.length).toBeGreaterThan(0);
  expect(gemCells).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ released: 'false', status: 'Locked' })
    ])
  );
  expect(gemCells.every((cell) => cell.released === 'false' && cell.status === 'Locked')).toBe(true);

  const waterBaseImage = page.locator('[data-sprite-card][data-id="water-base"] img');
  const waterGem = page.locator('[data-sprite-card][data-id="water-gem"]');
  const waterBaseSrc = await waterBaseImage.getAttribute('src');
  if (!waterBaseSrc) throw new Error('Water base artwork is missing.');
  await expect(waterGem.locator('img')).toHaveAttribute('src', waterBaseSrc);
  await expect(waterGem.locator('img')).toHaveCSS('opacity', '0.5');
  await expect(waterGem.locator('img')).toHaveCSS('filter', /brightness\(0\)/);
});
