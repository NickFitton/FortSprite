import { useUser } from "@clerk/tanstack-react-start";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Cell, Label, Pie, PieChart, Tooltip } from "recharts";
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
    <main className="page-wrap px-4 py-12">
      <section>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="island-kicker mb-2">
              Chapter {season.chapterNumber} · Season {season.seasonNumber}
            </p>
            <h1 className="display-title mb-3 text-4xl font-bold text-[var(--sea-ink)] sm:text-5xl">
              {season.name}
            </h1>
            <p className="m-0 text-base leading-8 text-[var(--sea-ink-soft)]">
              Season details will appear here.
            </p>
          </div>
          <Tabs
            value={overviewView}
            onValueChange={(value) => {
              if (value === "stats" || value === "chart") {
                setOverviewView(value);
              }
            }}
            className="w-full sm:w-80 sm:shrink-0 gap-0"
          >
            <TabsList aria-label="Released sprite overview display">
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
                  <Card className="p-2">
                    <div className="flex flex-row justify-center items-center gap-4">
                      <span>Released sprites</span>
                      <span className="text-lg font-semibold text-[var(--sea-ink)]">
                        {releasedSpriteCount}
                      </span>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-3 gap-x-3 gap-y-3 text-center text-sm">
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
                  <Card className="flex flex-col items-center">
                    <PieChart
                      width={256}
                      height={190}
                      accessibilityLayer
                      title="Released sprite collection progress"
                    >
                      <Pie
                        data={releasedSpriteChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={78}
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
                    <ul className="grid w-full grid-cols-3 gap-2 text-center text-xs">
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
        <Card className="mt-8 max-sm:gap-0 max-sm:overflow-visible max-sm:rounded-none max-sm:bg-transparent max-sm:py-0 max-sm:ring-0">
          <CardHeader className="max-sm:px-0"></CardHeader>
          <CardContent className="max-sm:-mx-4 max-sm:px-0">
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
