import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/seasons/$seasonId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { seasonId } = Route.useParams();
  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center">
      <div>Hello "/admin/seasons/{seasonId}!</div>
    </div>
  );
}
