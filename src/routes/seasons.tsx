import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/seasons")({
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
