import { createFileRoute, redirect } from "@tanstack/react-router";
import { getLatestSeason } from "#/seasons.functions";

export const Route = createFileRoute("/")({
  loader: async () => {
    const latestSeason = await getLatestSeason();

    throw redirect({
      to: "/seasons/$seasonId",
      params: { seasonId: String(latestSeason.id) },
    });
  },
});
