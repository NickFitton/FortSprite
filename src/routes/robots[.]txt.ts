import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const sitemapUrl = new URL("/sitemap.xml", request.url).toString();

        return new Response(
          `User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: ${sitemapUrl}\n`,
          {
            headers: {
              "Cache-Control": "public, max-age=3600, s-maxage=86400",
              "Content-Type": "text/plain; charset=utf-8",
            },
          },
        );
      },
    },
  },
});
