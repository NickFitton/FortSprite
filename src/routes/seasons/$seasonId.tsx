import { useUser } from "@clerk/tanstack-react-start";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Cell,
  Label,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { SpriteVariantTable } from "#/components/SpriteVariantTable";
import { Card, CardContent, CardHeader } from "#/components/ui/card";
import { Separator } from "#/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
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
  const [overviewView, setOverviewView] = useState<"stats" | "chart">("stats");
  const [overviewContentHeight, setOverviewContentHeight] = useState<number>();
  const overviewContentRef = useRef<HTMLDivElement>(null);
  const collectionStatusBySpriteVariantId = new Map(
    season.userCollections.map((collection) => [
      collection.spriteVariantId,
      collection.status,
    ]),
  );
  const releasedSpriteOverview = season.spriteVariants.reduce(
    (overview, spriteVariant) => {
      if (!spriteVariant.isReleased) {
        return overview;
      }

      switch (collectionStatusBySpriteVariantId.get(spriteVariant.id)) {
        case "MASTERED":
          overview.mastered += 1;
          break;
        case "EXTRACTED":
          overview.extracted += 1;
          break;
        default:
          overview.notFound += 1;
      }

      return overview;
    },
    { notFound: 0, extracted: 0, mastered: 0 },
  );
  const releasedSpriteCount =
    releasedSpriteOverview.notFound +
    releasedSpriteOverview.extracted +
    releasedSpriteOverview.mastered;
  const releasedSpriteChartData = [
    {
      name: "Not found",
      value: releasedSpriteOverview.notFound,
      color: "#9ca3af",
    },
    {
      name: "Extracted",
      value: releasedSpriteOverview.extracted,
      color: "#16a34a",
    },
    {
      name: "Mastered",
      value: releasedSpriteOverview.mastered,
      color: "#eab308",
    },
  ];

  useEffect(() => {
    const content = overviewContentRef.current;

    if (!content) {
      return;
    }

    const updateHeight = () => {
      setOverviewContentHeight(content.getBoundingClientRect().height);
    };
    const resizeObserver = new ResizeObserver(updateHeight);

    updateHeight();
    resizeObserver.observe(content);

    return () => resizeObserver.disconnect();
  }, []);

  return (
    <main className="page-wrap px-4 py-8 sm:py-12">
      <section className="season-detail">
        <div className="season-detail__header flex flex-col gap-8">
          <div className="min-w-0 max-w-2xl">
            <p className="island-kicker mb-2">
              Chapter {season.chapterNumber} · Season {season.seasonNumber}
            </p>
            <h1 className="display-title mb-3 text-4xl font-bold text-[var(--sea-ink)] sm:text-5xl">
              {season.name}
            </h1>
            <p className="m-0 text-base leading-8 text-[var(--sea-ink-soft)]">
              Season details will appear here.
            </p>
            {season.chapterNumber === 7 && season.seasonNumber === 3 && (
              <p className="mt-2 text-base leading-8 text-[var(--sea-ink-soft)]">
                Historic chapter progress will be displayed here soon.
              </p>
            )}
          </div>
          <Tabs
            value={overviewView}
            onValueChange={(value) => {
              if (value === "stats" || value === "chart") {
                setOverviewView(value);
              }
            }}
            className="season-detail__overview w-full max-w-md self-center gap-0"
          >
            <TabsList
              aria-label="Released sprite overview display"
              className="w-full"
            >
              <TabsTrigger value="stats">Stats</TabsTrigger>
              <TabsTrigger value="chart">Chart</TabsTrigger>
            </TabsList>
            <div
              className="overflow-hidden transition-[height] duration-300 ease-out motion-reduce:transition-none"
              style={
                overviewContentHeight === undefined
                  ? undefined
                  : { height: overviewContentHeight }
              }
            >
              <div ref={overviewContentRef}>
                <TabsContent value="stats" className="pt-4">
                  <Card className="gap-3 p-3">
                    <div className="flex items-center justify-between gap-4">
                      <span>Released sprites</span>
                      <span className="text-lg font-semibold text-[var(--sea-ink)]">
                        {releasedSpriteCount}
                      </span>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-1 gap-2 text-sm min-[380px]:grid-cols-3 min-[380px]:gap-x-3 min-[380px]:gap-y-3 min-[380px]:text-center">
                      <div>
                        <dt className="text-muted-foreground">Not found</dt>
                        <dd className="font-semibold text-[var(--sea-ink)]">
                          {releasedSpriteOverview.notFound}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Extracted</dt>
                        <dd className="font-semibold text-green-700 dark:text-green-300">
                          {releasedSpriteOverview.extracted}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Mastered</dt>
                        <dd className="font-semibold text-yellow-700 dark:text-yellow-300">
                          {releasedSpriteOverview.mastered}
                        </dd>
                      </div>
                    </div>
                  </Card>
                </TabsContent>
                <TabsContent value="chart" className="pt-4">
                  <Card className="items-center gap-3 p-3">
                    <div className="h-48 w-full max-w-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart
                          accessibilityLayer
                          title="Released sprite collection progress"
                        >
                          <Pie
                            data={releasedSpriteChartData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius="58%"
                            outerRadius="82%"
                            paddingAngle={3}
                            stroke="none"
                          >
                            {releasedSpriteChartData.map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                            <Label
                              value={releasedSpriteCount}
                              position="center"
                              className="fill-[var(--sea-ink)] text-xl font-semibold"
                            />
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className="grid w-full grid-cols-1 gap-1 text-sm min-[380px]:grid-cols-3 min-[380px]:gap-2 min-[380px]:text-center min-[380px]:text-xs">
                      {releasedSpriteChartData.map((entry) => (
                        <li key={entry.name}>
                          <span
                            aria-hidden="true"
                            className="mr-1 inline-block size-2 rounded-full"
                            style={{ backgroundColor: entry.color }}
                          />
                          <span className="text-muted-foreground">
                            {entry.name}
                          </span>
                          <span className="ml-1 font-semibold text-[var(--sea-ink)]">
                            {entry.value}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                </TabsContent>
              </div>
            </div>
          </Tabs>
        </div>
        <Card className="mt-8 max-lg:gap-0 max-lg:overflow-visible max-lg:rounded-none max-lg:bg-transparent max-lg:py-0 max-lg:ring-0">
          <CardHeader className="max-lg:px-0"></CardHeader>
          <CardContent className="max-lg:-mx-4 max-lg:px-0">
            <SpriteVariantTable
              sprites={season.sprites}
              variants={season.variants}
              spriteVariants={season.spriteVariants}
              userCollections={season.userCollections}
              hideReleasedStatus
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
