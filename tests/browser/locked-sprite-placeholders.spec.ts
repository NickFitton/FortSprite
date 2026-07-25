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
