import { Link } from "@tanstack/react-router";
import {
	CircleAlertIcon,
	CircleCheckIcon,
	CircleDashedIcon,
} from "lucide-react";
import type { ComponentProps } from "react";
import ClerkHeader from "../integrations/clerk/header-user.tsx";
import ThemeToggle from "./ThemeToggle";
import {
	NavigationMenu,
	NavigationMenuContent,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	NavigationMenuTrigger,
	navigationMenuTriggerStyle,
} from "./ui/navigation-menu.tsx";

function ListItem({
	title,
	children,
	href,
	...props
}: React.ComponentPropsWithoutRef<"li"> & {
	href: ComponentProps<typeof Link>["to"];
}) {
	return (
		<li {...props}>
			<NavigationMenuLink
				render={
					<Link to={href}>
						<div className="flex flex-col gap-1 text-sm">
							<div className="leading-none font-medium">{title}</div>
							<div className="line-clamp-2 text-muted-foreground">
								{children}
							</div>
						</div>
					</Link>
				}
			/>
		</li>
	);
}

export default function Header() {
	return (
		<header className="border-b border-[var(--line)] bg-[var(--header-bg)] px-4 backdrop-blur-lg p-2 flex flex-row gap-2 justify-between">
			<NavigationMenu>
				<NavigationMenuList>
					<NavigationMenuItem>
						<NavigationMenuLink
							className={navigationMenuTriggerStyle()}
							render={<Link to="/">Home</Link>}
						/>
					</NavigationMenuItem>
					<NavigationMenuItem>
						<NavigationMenuLink
							className={navigationMenuTriggerStyle()}
							render={<Link to="/about">About</Link>}
						/>
					</NavigationMenuItem>
					<NavigationMenuItem>
						<NavigationMenuLink
							className={navigationMenuTriggerStyle()}
							render={<Link to="/">Docs</Link>}
						/>
					</NavigationMenuItem>
					<NavigationMenuItem>
						<NavigationMenuTrigger>Demos</NavigationMenuTrigger>
						<NavigationMenuContent>
							<ul className="w-96">
								<ListItem href="/demo/clerk" title="Introduction">
									Clerk
								</ListItem>
								<ListItem href="/demo/prisma" title="Installation">
									Prisma
								</ListItem>
							</ul>
						</NavigationMenuContent>
					</NavigationMenuItem>
					<NavigationMenuItem>
						<NavigationMenuLink
							className={navigationMenuTriggerStyle()}
							render={<Link to="/admin/seasons">Admin</Link>}
						/>
					</NavigationMenuItem>
				</NavigationMenuList>
			</NavigationMenu>
			<div className="flex flex-row align-center gap-2">
				<ClerkHeader />
				<ThemeToggle />
			</div>
		</header>
	);
}
