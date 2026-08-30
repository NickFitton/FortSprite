import { useUser } from "@clerk/tanstack-react-start";
import { Link, useMatchRoute } from "@tanstack/react-router";
import {
  CalendarDaysIcon,
  FolderCogIcon,
  HomeIcon,
  LeafIcon,
} from "lucide-react";
import ClerkHeader from "../integrations/clerk/header-user.tsx";
import ThemeToggle from "./ThemeToggle.tsx";
import {
  Sidebar as BaseSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "./ui/sidebar.tsx";

const navigation = [{ title: "Home", to: "/", icon: HomeIcon }] as const;

const adminNavigation = {
  title: "Admin",
  to: "/admin/seasons",
  icon: FolderCogIcon,
} as const;

export default function Sidebar({
  seasons,
}: {
  seasons: Array<{
    id: number;
    name: string;
    chapterNumber: number;
    seasonNumber: number;
  }>;
}) {
  const matchRoute = useMatchRoute();
  const { user } = useUser();
  const visibleNavigation =
    user?.publicMetadata.isAdmin === true
      ? [...navigation, adminNavigation]
      : navigation;

  return (
    <BaseSidebar collapsible="icon" className="border-[var(--line)]">
      <SidebarHeader className="flex-row items-center justify-between p-3 group-data-[collapsible=icon]:justify-center">
        <Link
          to="/"
          className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-2 text-[var(--sea-ink)] no-underline transition hover:bg-sidebar-accent group-data-[collapsible=icon]:hidden"
        >
          <span className="flex size-7 items-center justify-center rounded-md bg-[var(--lagoon-deep)] text-[var(--foam)]">
            <LeafIcon className="size-4" />
          </span>
          <span className="font-semibold group-data-[collapsible=icon]:hidden">
            Fort Sprite
          </span>
        </Link>
        <SidebarTrigger className="shrink-0" />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleNavigation.map((item) => {
                const isActive = Boolean(
                  matchRoute({
                    to: item.to,
                    fuzzy: item.to === "/admin/seasons",
                  }),
                );

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.title}
                      render={<Link to={item.to} />}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Seasons</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {seasons.map((season) => (
                <SidebarMenuItem key={season.id}>
                  <SidebarMenuButton
                    isActive={Boolean(
                      matchRoute({
                        to: "/seasons/$seasonId",
                        params: { seasonId: String(season.id) },
                      }),
                    )}
                    tooltip={season.name}
                    render={
                      <Link
                        to="/seasons/$seasonId"
                        params={{ seasonId: String(season.id) }}
                      />
                    }
                  >
                    <CalendarDaysIcon />
                    <span>
                      C{season.chapterNumber}:S{season.seasonNumber} -{" "}
                      {season.name}
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-[var(--line)] p-3">
        <div className="flex items-center justify-between gap-2 group-data-[collapsible=icon]:justify-center">
          <div className="group-data-[collapsible=icon]:hidden">
            <ThemeToggle />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <ClerkHeader />
          </div>
          <div className="hidden group-data-[collapsible=icon]:block">
            <ClerkHeader />
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </BaseSidebar>
  );
}
