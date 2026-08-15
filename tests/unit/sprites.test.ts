import { describe, expect, it } from 'vitest';
import {
  claimableSprites,
  selectableSpriteNames,
  specialSprites,
  spriteRows,
  sprites,
  variants
} from '../../src/data/sprites.js';

const regularSpriteKeys = ['llama', 'peely'];

describe('new base sprites', () => {
  it('orders checklist rows to match the in-game sprite list', () => {
    expect(spriteRows.slice(0, 22).map(({ key }) => key)).toEqual([
      'john-wick', 'batman', 'water', 'earth', 'fire', 'duck', 'ghost',
      'dream', 'demon', 'punk', 'king', 'burnt-peanut', 'vini-jr', 'fishy',
      'striker', 'aura', 'boss', 'air', 'seven', 'pollo', 'llama', 'peely'
    ]);
  });

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

  it('only enables sprites listed in trueList.txt', () => {
    const listNameFor = (sprite: { family: string; variant: string }) =>
      sprite.variant === 'Base' ? sprite.family : `${sprite.variant} ${sprite.family}`;

    expect(claimableSprites.map(listNameFor).sort()).toEqual([...selectableSpriteNames].sort());
    expect(claimableSprites).toHaveLength(selectableSpriteNames.length);
    expect(sprites.filter(({ released }) => !released).map(({ id }) => id)).toEqual(
      expect.arrayContaining(['water-cube', 'earth-holofoil', 'duck-holofoil', 'punk-gem', 'peely-gem'])
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
