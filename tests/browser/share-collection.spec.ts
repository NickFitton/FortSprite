import { expect, test } from '@playwright/test';

test('exports a branded photo with every variant column', async ({ page }) => {
  await page.goto('/');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Share collection' }).click();
  const download = await downloadPromise;
  const image = await download.createReadStream();
  const chunks: Buffer[] = [];

  for await (const chunk of image!) chunks.push(chunk);

  const png = Buffer.concat(chunks);
  expect(png.subarray(12, 16).toString()).toBe('IHDR');
  expect(png.readUInt32BE(16)).toBe(646);
  expect(png.readUInt32BE(20)).toBe(2768);

  const wordmarkPixels = await page.evaluate(async (base64) => {
    const image = await createImageBitmap(await (await fetch(`data:image/png;base64,${base64}`)).blob());
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = 82;
    const context = canvas.getContext('2d')!;
    context.drawImage(image, 0, 0);

    let brightPixelCount = 0;
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let index = 0; index < pixels.length; index += 4) {
      const red = pixels[index];
      const green = pixels[index + 1];
      const blue = pixels[index + 2];
      if (red > 240 && green > 240 && blue > 240) brightPixelCount += 1;
    }
    return brightPixelCount;
  }, png.toString('base64'));

  expect(wordmarkPixels).toBeGreaterThan(500);
});
