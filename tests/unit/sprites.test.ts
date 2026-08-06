import { describe, expect, it } from 'vitest';
import { claimableSprites, specialSprites, spriteRows, sprites, variants } from '../../src/data/sprites.js';

const regularSpriteKeys = ['llama', 'peely'];

describe('new base sprites', () => {
  it('includes the released Quack reward variants with their exact Fortnite.gg artwork', () => {
    expect(
      sprites
        .filter(({ variant, hasExactImage }) => variant === 'Quack' && hasExactImage)
        .map(({ id, released, hasExactImage }) => ({ id, released, hasExactImage }))
    ).toEqual([
      { id: 'water-quack', released: true, hasExactImage: true },
      { id: 'earth-quack', released: true, hasExactImage: true },
      { id: 'fire-quack', released: true, hasExactImage: true },
      { id: 'zero-point-quack', released: true, hasExactImage: true }
    ]);
  });

  it('renders Llama and Peely as regular families with their scraped variants', () => {
    expect(spriteRows.filter(({ key }) => regularSpriteKeys.includes(key))).toHaveLength(2);

    for (const key of regularSpriteKeys) {
      expect(sprites.filter((sprite) => sprite.key === key).map(({ variant }) => variant)).toEqual(variants);
    }

    expect(
      sprites
        .filter(({ key, hasExactImage }) => key === 'llama' && hasExactImage)
        .map(({ variant }) => variant)
    ).toEqual(['Base', 'Gold', 'Gummy', 'Galaxy', 'Gem']);
    expect(
      sprites
        .filter(({ key, hasExactImage }) => key === 'peely' && hasExactImage)
        .map(({ variant }) => variant)
    ).toEqual(['Base', 'Gold', 'Gummy', 'Galaxy', 'Holofoil']);
  });

  it('includes released special sprites while keeping unreleased variants out of the checklist', () => {
    expect(claimableSprites.map(({ id }) => id)).toEqual(
      expect.arrayContaining([
        'llama-base', 'llama-gold', 'llama-gummy', 'llama-galaxy',
        'peely-base', 'peely-gold', 'peely-gummy', 'peely-galaxy', 'peely-holofoil',
        'john-wick-base', 'ironmouse-base'
      ])
    );
    expect(claimableSprites.map(({ id }) => id)).not.toEqual(
      expect.arrayContaining(['llama-gem'])
    );
    expect(specialSprites.map(({ key }) => key)).toEqual(
      expect.arrayContaining(['john-wick', 'ironmouse'])
    );
  });

  it('lists Ironmouse’s health-regeneration, Cloak, and low-gravity power at every level', () => {
    const ironmouse = specialSprites.find(({ key }) => key === 'ironmouse');

    expect(ironmouse).toMatchObject({
      released: true,
      ability: "When equipped, the Ironmouse Sprite gradually restores your health when low. While regenerating, you're cloaked and gain the low gravity effect.",
      levelEffects: [
        { level: 1, effect: 'Regenerates health up to 60.' },
        { level: 2, effect: 'Regenerates health up to 70.' },
        { level: 3, effect: 'Regenerates health up to 80.' },
        { level: 4, effect: 'Regenerates health up to 90.' },
        { level: 5, effect: 'Regenerates health up to 100.' }
      ]
    });
  });
});
