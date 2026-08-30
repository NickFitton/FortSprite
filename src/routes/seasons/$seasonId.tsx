import { useUser } from "@clerk/tanstack-react-start";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { SpriteVariantTable } from "#/components/SpriteVariantTable";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card";
import { toast } from "#/components/ui/toast";
import {
  advanceSpriteVariantCollection,
  getSeasonById,
} from "#/seasons.functions";

export const Route = createFileRoute("/seasons/$seasonId")({
  loader: ({ params }) => getSeasonById({ data: params.seasonId }),
  component: SeasonPage,
});

function SeasonPage() {
  const season = Route.useLoaderData();
  const router = useRouter();
  const { isSignedIn } = useUser();
  const [isRecordingExtraction, setIsRecordingExtraction] = useState(false);

  return (
    <main className="page-wrap px-4 py-12">
      <section className="island-shell rounded-2xl p-6 sm:p-8">
        <p className="island-kicker mb-2">
          Chapter {season.chapterNumber} · Season {season.seasonNumber}
        </p>
        <h1 className="display-title mb-3 text-4xl font-bold text-[var(--sea-ink)] sm:text-5xl">
          {season.name}
        </h1>
        <p className="m-0 text-base leading-8 text-[var(--sea-ink-soft)]">
          Season details will appear here.
        </p>
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Sprite Variants</CardTitle>
            <CardDescription>
              Browse the sprite variants available in this season.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SpriteVariantTable
              sprites={season.sprites}
              variants={season.variants}
              spriteVariants={season.spriteVariants}
              userCollections={season.userCollections}
              onClick={async ({ sprite, variant, spriteVariant }) => {
                if (!spriteVariant || isRecordingExtraction) {
                  return;
                }

                if (!isSignedIn) {
                  toast.add({
                    title: "Sign in to track progress",
                    description:
                      "Sign in before marking a sprite as extracted.",
                  });
                  return;
                }

                try {
                  setIsRecordingExtraction(true);
                  const collection = await advanceSpriteVariantCollection({
                    data: {
                      seasonId: season.id,
                      spriteVariantId: spriteVariant.id,
                    },
                  });
                  await router.invalidate();
                  toast.add({
                    title:
                      collection === null
                        ? "Sprite removed"
                        : collection.status === "MASTERED"
                          ? "Sprite mastered"
                          : "Sprite extracted",
                    description:
                      collection === null
                        ? `${sprite.name} · ${variant.name} was removed from your collection.`
                        : collection.status === "MASTERED"
                          ? `${sprite.name} · ${variant.name} is mastered.`
                          : `${sprite.name} · ${variant.name} was added to your collection.`,
                  });
                } catch (error) {
                  console.error("Failed to record sprite extraction:", error);
                  toast.add({
                    title: "Couldn't record extraction",
                    description: "Please try again.",
                  });
                } finally {
                  setIsRecordingExtraction(false);
                }
              }}
            />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
