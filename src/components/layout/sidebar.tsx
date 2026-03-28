"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Image,
  ListMusic,
  Calendar,
  Monitor,
  Megaphone,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/lib/hooks/use-user";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/media", label: "Media Library", icon: Image },
  { href: "/playlists", label: "Playlists", icon: ListMusic },
  { href: "/schedules", label: "Schedules", icon: Calendar },
  { href: "/screens", label: "Screens", icon: Monitor },
  { href: "/announcements", label: "Announcements", icon: Megaphone },
  { href: "/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const { user, loading } = useUser();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const displayName =
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Admin User";
  const displayEmail = user?.email || "admin@elevasign.com";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside
      className={cn(
        "flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground",
        className
      )}
    >
      {/* Brand */}
      <div className="flex h-14 items-center gap-2.5 px-5">
        <div className="flex size-7 items-center justify-center rounded-lg bg-primary">
          <Monitor className="size-4 text-primary-foreground" />
        </div>
        <span className="text-base font-semibold tracking-tight">
          ElevaSign
        </span>
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "size-4 shrink-0 transition-colors",
                  active
                    ? "text-sidebar-primary"
                    : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/70"
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Separator className="bg-sidebar-border" />

      {/* User section */}
      <div className="p-3">
        <div className="flex items-center gap-3 rounded-md px-3 py-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {loading ? ".." : initials}
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium leading-tight">
              {loading ? "Loading..." : displayName}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {loading ? "" : "Administrator"}
            </span>
          </div>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                />
              }
              onClick={handleLogout}
            >
              <LogOut className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent side="top">Sign out</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </aside>
  );
}
