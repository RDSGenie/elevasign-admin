"use client";

import {
  Monitor,
  ListMusic,
  Megaphone,
  Upload,
  Plus,
  Activity,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useRouter } from "next/navigation";

// -- Placeholder data (will be replaced with Supabase queries) --

const stats = [
  {
    label: "Screens Online",
    value: 8,
    icon: Monitor,
    dotColor: "bg-emerald-500",
    change: "+2 this week",
  },
  {
    label: "Screens Offline",
    value: 2,
    icon: Monitor,
    dotColor: "bg-red-500",
    change: "1 needs attention",
  },
  {
    label: "Active Playlists",
    value: 5,
    icon: ListMusic,
    dotColor: "bg-primary",
    change: "3 scheduled",
  },
  {
    label: "Active Announcements",
    value: 3,
    icon: Megaphone,
    dotColor: "bg-amber-500",
    change: "1 expiring soon",
  },
];

const screens = [
  {
    id: "scr-001",
    name: "Lobby - Tower A",
    status: "online" as const,
    playlist: "Morning Rotation",
    lastHeartbeat: "2 minutes ago",
  },
  {
    id: "scr-002",
    name: "Lobby - Tower B",
    status: "online" as const,
    playlist: "Corporate Reel",
    lastHeartbeat: "1 minute ago",
  },
  {
    id: "scr-003",
    name: "Elevator #3 - Floor 12",
    status: "offline" as const,
    playlist: "Evening Playlist",
    lastHeartbeat: "3 hours ago",
  },
  {
    id: "scr-004",
    name: "Elevator #7 - Floor 5",
    status: "online" as const,
    playlist: "Morning Rotation",
    lastHeartbeat: "30 seconds ago",
  },
  {
    id: "scr-005",
    name: "Parking Garage - B1",
    status: "online" as const,
    playlist: "Safety Notices",
    lastHeartbeat: "45 seconds ago",
  },
  {
    id: "scr-006",
    name: "Conference Room Lobby",
    status: "offline" as const,
    playlist: "Welcome Loop",
    lastHeartbeat: "1 day ago",
  },
];

const recentActivity = [
  {
    id: 1,
    action: "Playlist updated",
    detail: '"Morning Rotation" was modified',
    time: "10 minutes ago",
  },
  {
    id: 2,
    action: "Screen connected",
    detail: '"Lobby - Tower A" came online',
    time: "25 minutes ago",
  },
  {
    id: 3,
    action: "Media uploaded",
    detail: "3 new images added to library",
    time: "1 hour ago",
  },
  {
    id: 4,
    action: "Announcement created",
    detail: '"Fire Drill Notice" published',
    time: "2 hours ago",
  },
  {
    id: 5,
    action: "Screen disconnected",
    detail: '"Conference Room Lobby" went offline',
    time: "1 day ago",
  },
];

export default function DashboardPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription className="text-sm font-medium">
                {stat.label}
              </CardDescription>
              <stat.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block size-2 rounded-full ${stat.dotColor}`}
                />
                <span className="text-2xl font-bold">{stat.value}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Screen status + Recent activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Screen status cards */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Screen Status</CardTitle>
                  <CardDescription>
                    Real-time status of all paired screens
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/screens")}
                >
                  View all
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {screens.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Monitor className="mb-3 size-10 text-muted-foreground/40" />
                  <p className="text-sm font-medium text-muted-foreground">
                    No screens paired yet
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    Pair a screen to start displaying content.
                  </p>
                  <Button
                    size="sm"
                    className="mt-4"
                    onClick={() => router.push("/screens")}
                  >
                    <Plus className="mr-1.5 size-3.5" />
                    Pair Screen
                  </Button>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {screens.map((screen) => (
                    <div
                      key={screen.id}
                      className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="mt-0.5">
                        <Monitor className="size-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">
                            {screen.name}
                          </span>
                          <Badge
                            variant={
                              screen.status === "online"
                                ? "default"
                                : "secondary"
                            }
                            className={
                              screen.status === "online"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-red-500/10 text-red-600 dark:text-red-400"
                            }
                          >
                            {screen.status}
                          </Badge>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {screen.playlist}
                        </p>
                        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground/70">
                          <Clock className="size-3" />
                          {screen.lastHeartbeat}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent activity */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest actions and events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                {recentActivity.map((item, i) => (
                  <div key={item.id}>
                    <div className="flex items-start gap-3 py-2.5">
                      <div className="mt-1">
                        <Activity className="size-3.5 text-muted-foreground/50" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-tight">
                          {item.action}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {item.detail}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground/60">
                          {item.time}
                        </p>
                      </div>
                    </div>
                    {i < recentActivity.length - 1 && (
                      <Separator className="my-0" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks to manage your digital signage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => router.push("/media")}
            >
              <Upload className="size-4" />
              Upload Media
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => router.push("/playlists")}
            >
              <ListMusic className="size-4" />
              Create Playlist
            </Button>
            <Button
              className="gap-2"
              onClick={() => router.push("/announcements")}
            >
              <Megaphone className="size-4" />
              New Announcement
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
