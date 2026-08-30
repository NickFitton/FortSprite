import { createFileRoute, redirect } from "@tanstack/react-router";
import { getLatestSeason } from "#/seasons.functions";

export const Route = createFileRoute("/")({
  loader: async () => {
    const latestSeason = await getLatestSeason();

    if (latestSeason) {
      throw redirect({
        to: "/seasons/$seasonId",
        params: { seasonId: String(latestSeason.id) },
      });
    }
  },
  component: EmptySeasons,
});

function EmptySeasons() {
  return (
    <section className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="max-w-md text-center">
        <p className="text-sm font-medium text-[var(--sea-muted)]">
          Nothing to explore yet
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--sea-ink)]">
          No seasons have been created.
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--sea-muted)]">
          Check back once the first season is ready.
        </p>
      </div>
    </section>
  );
}
