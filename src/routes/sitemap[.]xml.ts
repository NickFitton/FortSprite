import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "#/db";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const seasons = await prisma.season.findMany({
          where: { isPublic: true },
          select: { id: true },
          orderBy: [{ chapterNumber: "desc" }, { seasonNumber: "desc" }],
        });
        const sitemapEntries = seasons
          .map((season) => {
            const location = new URL(`/seasons/${season.id}`, request.url);
            return `  <url><loc>${location}</loc></url>`;
          })
          .join("\n");
        const xml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          sitemapEntries,
          "</urlset>",
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Cache-Control": "public, max-age=3600, s-maxage=3600",
            "Content-Type": "application/xml; charset=utf-8",
          },
        });
      },
    },
  },
});
