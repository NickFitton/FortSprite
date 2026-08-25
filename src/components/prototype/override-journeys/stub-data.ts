// PROTOTYPE — throwaway. Stub catalogue shaped like the data contract settled in
// "Specify the Override catalogue data contract" (issue #27). Season titles other
// than Override are placeholders; art is borrowed from the live catalogue so the
// variants can be judged at real density.
import { spriteRows, variants } from '../../../data/sprites.js';

export type ProgressStatus = 'none' | 'extracted' | 'mastered';

export type ProtoVariant = {
  id: string;
  definition: string;
  label: string;
  name: string;
  image: string;
  locked: boolean;
  unlocksOn: string | null;
  progress: ProgressStatus;
};

export type ProtoSprite = {
  id: string;
  name: string;
  rarity: string;
  ability: string;
  variants: ProtoVariant[];
  fullyLocked: boolean;
};

export type ChapterSeason = {
  id: string;
  chapter: number;
  season: number;
  title: string;
  current: boolean;
  spriteCount: number;
};

export const chapterSeasons: ChapterSeason[] = [
  { id: 'ch7s4', chapter: 7, season: 4, title: 'Override', current: true, spriteCount: 14 },
  { id: 'ch7s3', chapter: 7, season: 3, title: 'Shockwave', current: false, spriteCount: 25 },
  { id: 'ch7s2', chapter: 7, season: 2, title: 'Hunters', current: false, spriteCount: 21 }
];

export const currentSeason = chapterSeasons[0];
export const historicalSeasons = chapterSeasons.filter((season) => !season.current);

/** Variant definitions are a chapter-season-level managed list; archived ones stay visible to admins only. */
export const variantDefinitions = [
  ...variants.map((name) => ({ name, label: name === 'Base' ? 'Regular' : name, archived: false, uses: 0 })),
  { name: 'Chrome', label: 'Chrome', archived: true, uses: 6 }
];

export const activeDefinitions = variantDefinitions.filter((definition) => !definition.archived);

// Deterministic pseudo-progress so every reload shows the same board.
function hash(value: string): number {
  let total = 0;
  for (let index = 0; index < value.length; index += 1) total = (total * 31 + value.charCodeAt(index)) % 9973;
  return total;
}

function progressFor(id: string): ProgressStatus {
  const bucket = hash(id) % 10;
  if (bucket < 4) return 'none';
  if (bucket < 8) return 'extracted';
  return 'mastered';
}

const LOCKED_ROWS = 3; // trailing families that have not been released yet
const LATE_DEFINITIONS = new Set(['Gem', 'Holofoil']);
const UNLOCK_DATES = ['3 Sep', '10 Sep', '17 Sep', '24 Sep'];

const sourceRows = spriteRows.slice(0, 14);

export const catalogue: ProtoSprite[] = sourceRows.map((row: any, rowIndex: number) => {
  const fullyLocked = rowIndex >= sourceRows.length - LOCKED_ROWS;

  const rowVariants: ProtoVariant[] = row.cells
    .map((cell: any, cellIndex: number) => {
      if (!cell) return null;
      const definition = variants[cellIndex];
      const lateVariant = LATE_DEFINITIONS.has(definition) && rowIndex % 3 === 0;
      const locked = fullyLocked || lateVariant;

      return {
        id: cell.id,
        definition,
        label: definition === 'Base' ? 'Regular' : definition,
        name: cell.name,
        image: cell.image,
        locked,
        unlocksOn: locked ? UNLOCK_DATES[(rowIndex + cellIndex) % UNLOCK_DATES.length] : null,
        progress: locked ? 'none' : progressFor(cell.id)
      } satisfies ProtoVariant;
    })
    .filter(Boolean) as ProtoVariant[];

  return {
    id: row.key,
    name: row.name,
    rarity: row.rarity,
    ability: row.ability,
    variants: rowVariants,
    fullyLocked
  };
});

export const allVariants = catalogue.flatMap((sprite) => sprite.variants);
export const releasedVariants = allVariants.filter((variant) => !variant.locked);
export const lockedVariants = allVariants.filter((variant) => variant.locked);

export const totals = {
  released: releasedVariants.length,
  locked: lockedVariants.length,
  extracted: releasedVariants.filter((variant) => variant.progress === 'extracted').length,
  mastered: releasedVariants.filter((variant) => variant.progress === 'mastered').length,
  missing: releasedVariants.filter((variant) => variant.progress === 'none').length
};

export const completion = Math.round((totals.mastered / Math.max(totals.released, 1)) * 100);

/** Variant definitions grouped by cell for the fixed-column matrix layouts. */
export function cellsFor(sprite: ProtoSprite) {
  return activeDefinitions.map((definition) =>
    sprite.variants.find((variant) => variant.definition === definition.name) ?? null
  );
}

/** Locked entries an administrator could release, newest first — drives the admin release queue. */
export const releaseQueue = catalogue
  .flatMap((sprite) => sprite.variants.filter((variant) => variant.locked).map((variant) => ({ sprite, variant })))
  .slice(0, 8);

/** Three sprites closest to complete — drives the progress-first variant's "next up". */
export const nextUp = catalogue
  .filter((sprite) => !sprite.fullyLocked)
  .map((sprite) => {
    const released = sprite.variants.filter((variant) => !variant.locked);
    const done = released.filter((variant) => variant.progress === 'mastered').length;
    return { sprite, done, total: released.length, remaining: released.length - done };
  })
  .filter((entry) => entry.remaining > 0)
  .sort((a, b) => a.remaining - b.remaining)
  .slice(0, 3);
