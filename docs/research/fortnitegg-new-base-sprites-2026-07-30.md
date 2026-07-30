# Fortnite.gg base-sprite check — 2026-07-30

## Finding

Fortnite.gg's current sprite catalogue lists four base sprites which are not represented in `src/data/sprites.js`: **John Wick**, **Ironmouse**, **Llama**, and **Peely**. Their exact 512×512 WebP icon assets have been copied to `public/sprites/` (the repository's existing sprite-asset location). No application code was changed by this research task.

| Sprite | Fortnite.gg evidence | Status shown by Fortnite.gg | Downloaded asset |
| --- | --- | --- | --- |
| John Wick | [item page](https://fortnite.gg/sprites/138-john-wick-sprite) · [source image](https://fortnite.gg/img/x/sprites/icons/T_Icon_Reload_FillerGrunt_icon_L.webp) | Mythic; 0% Sprite Chest chance | `T_Icon_Reload_FillerGrunt_icon_L.webp` |
| Ironmouse | [item page](https://fortnite.gg/sprites/150-ironmouse-sprite) · [source image](https://fortnite.gg/img/x/sprites/icons/T_Icon_BR_PedicureAntacid_L.webp) | Mythic; explicitly **Unreleased** | `T_Icon_BR_PedicureAntacid_L.webp` |
| Llama | [item page](https://fortnite.gg/sprites/151-llama-sprite) · [source image](https://fortnite.gg/img/x/sprites/icons/T_Icon_BR_Creature_Sprite_Llama_ui_L.webp) | Legendary; 4.45% Sprite Chest chance | `T_Icon_BR_Creature_Sprite_Llama_ui_L.webp` |
| Peely | [item page](https://fortnite.gg/sprites/156-peely-sprite) · [source image](https://fortnite.gg/img/x/sprites/icons/T_Icon_BR_Creature_Sprite_Peely_ui_L.webp) | Legendary; 4.62% Sprite Chest chance | `T_Icon_BR_Creature_Sprite_Peely_ui_L.webp` |

## Evidence and scope

- Checked on **2026-07-30**. [Fortnite.gg's collection page](https://fortnite.gg/sprites) now reports **108** entries; its version crawled two days earlier reported 91. This is evidence of a recently expanded catalogue, not a statement of an in-game release date.
- The four source-image responses were `200 image/webp`; their CDN `Last-Modified` values were 2026-07-30 around 15:38 UTC. That timestamp bounds the source update only.
- The repository already contains exact assets and special-sprite records for Burnt Peanut, Vini Jr., and Pollo, so they are not included in this gap list.
- Fortnite.gg is a third-party catalogue, not an Epic Games release announcement. Ironmouse should remain treated as unreleased unless an authoritative in-game or Epic source changes that status.
