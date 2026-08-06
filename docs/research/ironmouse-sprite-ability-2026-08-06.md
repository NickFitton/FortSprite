# Ironmouse Sprite ability — 2026-08-06

## Finding

The Ironmouse Sprite gradually restores the equipped player's health when it is low. During that regeneration, the player is cloaked and receives low gravity.

Epic stated this in its **EPIC**-flair post, *This Week In Fortnite: Runners | August 3*:

> When equipped, the Ironmouse Sprite gradually restores your health when low. While regenerating, you're cloaked and gain the low gravity effect.

The post also identifies the feature as “The Ironmouse Sprite Joins the Roster” and announced Ironmouse Hours beginning August 4, which independently establishes that this is the release communication rather than an unrelated player report. [Epic’s FortniteBR post (August 3, 2026)](https://www.reddit.com/r/FortniteBR/comments/1veptsp/this_week_in_fortnite_runners_august_3/)

## Recommended application value

Use the official sentence unchanged for the `ability` value:

```js
"When equipped, the Ironmouse Sprite gradually restores your health when low. While regenerating, you're cloaked and gain the low gravity effect."
```

## Level thresholds

Fortnite.GG's current [Ironmouse Sprite listing](https://fortnite.gg/sprites/150-ironmouse-sprite) reports the health-regeneration thresholds as **60 → 70 → 80 → 90 → 100** for Levels 1–5. Those values are used for the application's level effects.

No Epic/Fortnite primary source found in this check provides numeric per-level health caps, regeneration rate, cloak duration, or low-gravity tuning. The thresholds above are independently sourced from Fortnite.GG and should not be described as an official Epic statement.

## Source assessment

The citation is an official Epic communication published through Reddit rather than a `fortnite.com` news page: the author is `Capybro_Epic`, and the post carries Reddit’s **EPIC** affiliation label. It is therefore the primary statement of the gameplay effect, while the hosting platform is third-party.

Fortnite.GG is a third-party catalogue; it is used only for the per-level thresholds that the official post does not publish.
