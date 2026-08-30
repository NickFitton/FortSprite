import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { checkAdminAccess } from "#/integrations/clerk/admin";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
  beforeLoad: async () => {
    const { isAdmin } = await checkAdminAccess();

    if (!isAdmin) {
      throw redirect({ to: "/" });
    }
  },
});

function AdminLayout() {
  return <Outlet />;
}
