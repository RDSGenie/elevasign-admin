"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  Megaphone,
  User,
  Settings,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUser } from "@/lib/hooks/use-user";
import { createClient } from "@/lib/supabase/client";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/media": "Media Library",
  "/playlists": "Playlists",
  "/schedules": "Schedules",
  "/screens": "Screens",
  "/announcements": "Announcements",
  "/settings": "Settings",
};

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  if (pathname.startsWith("/playlists/")) return "Playlist Details";
  if (pathname.startsWith("/screens/")) return "Screen Details";
  return "ElevaSign";
}

export function Header({
  onMobileMenuToggle,
}: {
  onMobileMenuToggle?: () => void;
}) {
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
    "Admin";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur-sm supports-[backdrop-filter]:bg-background/60 lg:px-6">
      {/* Mobile menu toggle */}
      <Button
        variant="ghost"
        size="icon-sm"
        className="shrink-0 lg:hidden"
        onClick={onMobileMenuToggle}
      >
        <Menu className="size-5" />
        <span className="sr-only">Toggle menu</span>
      </Button>

      {/* Page title */}
      <h1 className="text-lg font-semibold tracking-tight">
        {getPageTitle(pathname)}
      </h1>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Quick action: New Announcement */}
      <Button
        variant="outline"
        size="sm"
        className="hidden gap-1.5 sm:flex"
        onClick={() => router.push("/announcements")}
      >
        <Megaphone className="size-3.5" />
        New Announcement
      </Button>

      {/* Mobile quick action */}
      <Button
        variant="outline"
        size="icon-sm"
        className="sm:hidden"
        onClick={() => router.push("/announcements")}
      >
        <Megaphone className="size-4" />
      </Button>

      {/* User dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {loading ? ".." : initials}
          </div>
          <span className="hidden font-medium md:inline-block">
            {loading ? "..." : displayName}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium">{displayName}</p>
            <p className="text-xs text-muted-foreground">
              {user?.email || "admin@elevasign.com"}
            </p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/settings")}>
            <User className="mr-2 size-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/settings")}>
            <Settings className="mr-2 size-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleLogout}
            className="text-destructive focus:text-destructive"
          >
            <LogOut className="mr-2 size-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
