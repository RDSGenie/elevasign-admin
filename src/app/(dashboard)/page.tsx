"use client";

import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  Monitor,
  ListMusic,
  Megaphone,
  Upload,
  Plus,
  Activity,
  Clock,
  Image,
  Wifi,
  HardDrive,
} from "lucide-react";
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  PolarAngleAxis,
  BarChart,
  Bar,
  XAxis,
  Cell,
  Tooltip,
} from "recharts";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  getDashboardStats,
  getRecentScreens,
  getRecentActivity,
  getFleetHealth,
  type DashboardStats,
  type DashboardScreen,
  type DashboardActivity,
  type FleetHealth,
} from "@/lib/supabase/dashboard-queries";

// ---------------------------------------------------------------------------
// Data hooks
// ---------------------------------------------------------------------------

function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: () => {
      const supabase = createClient();
      return getDashboardStats(supabase);
    },
    refetchInterval: 30_000, // refresh every 30 seconds
  });
}

function useDashboardScreens() {
  return useQuery<DashboardScreen[]>({
    queryKey: ["dashboard-screens"],
    queryFn: () => {
      const supabase = createClient();
      return getRecentScreens(supabase);
    },
    refetchInterval: 30_000,
  });
}

function useDashboardActivity() {
  return useQuery<DashboardActivity[]>({
    queryKey: ["dashboard-activity"],
    queryFn: () => {
      const supabase = createClient();
      return getRecentActivity(supabase);
    },
  });
}

function useFleetHealth() {
  return useQuery<FleetHealth>({
    queryKey: ["fleet-health"],
    queryFn: () => {
      const supabase = createClient();
      return getFleetHealth(supabase);
    },
    refetchInterval: 60_000,
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatHeartbeat(dateStr: string | null): string {
  if (!dateStr) return "Never";
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return "Unknown";
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const router = useRouter();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: screens = [], isLoading: screensLoading } =
    useDashboardScreens();
  const { data: activity = [], isLoading: activityLoading } =
    useDashboardActivity();
  const { data: fleet } = useFleetHealth();

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      {statsLoading ? (
        <StatsGridSkeleton />
      ) : stats ? (
        <StatsGrid stats={stats} />
      ) : null}

      {/* Fleet Health — only shown when there are screens with heartbeat data */}
      {fleet && fleet.screens.length > 0 && (
        <FleetHealthCard fleet={fleet} onViewScreens={() => router.push("/screens")} />
      )}

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
              {screensLoading ? (
                <ScreenGridSkeleton />
              ) : screens.length === 0 ? (
                <ScreenEmptyState onPair={() => router.push("/screens")} />
              ) : (
                <ScreenGrid screens={screens} />
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
              {activityLoading ? (
                <ActivitySkeleton />
              ) : activity.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <Activity className="mb-2 size-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    No recent activity
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    Activity will appear here as you manage content.
                  </p>
                </div>
              ) : (
                <ActivityList items={activity} />
              )}
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

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function StatsGrid({ stats }: { stats: DashboardStats }) {
  const items = [
    {
      label: "Screens Online",
      value: stats.screensOnline,
      icon: Monitor,
      dotColor: "bg-emerald-500",
      sub:
        stats.screensOnline + stats.screensOffline > 0
          ? `of ${stats.screensOnline + stats.screensOffline} total`
          : "No screens registered",
    },
    {
      label: "Screens Offline",
      value: stats.screensOffline,
      icon: Monitor,
      dotColor: "bg-red-500",
      sub:
        stats.screensOffline > 0
          ? `${stats.screensOffline} need${stats.screensOffline === 1 ? "s" : ""} attention`
          : "All screens online",
    },
    {
      label: "Active Playlists",
      value: stats.activePlaylists,
      icon: ListMusic,
      dotColor: "bg-primary",
      sub: stats.activePlaylists === 0 ? "No active playlists" : "Currently active",
    },
    {
      label: "Active Announcements",
      value: stats.activeAnnouncements,
      icon: Megaphone,
      dotColor: "bg-amber-500",
      sub:
        stats.activeAnnouncements === 0
          ? "No active announcements"
          : "Currently broadcasting",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((stat) => (
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
            <p className="mt-1 text-xs text-muted-foreground">{stat.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function StatsGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="size-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16" />
            <Skeleton className="mt-2 h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ScreenGrid({ screens }: { screens: DashboardScreen[] }) {
  return (
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
                variant={screen.is_online ? "default" : "secondary"}
                className={
                  screen.is_online
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-red-500/10 text-red-600 dark:text-red-400"
                }
              >
                {screen.is_online ? "online" : "offline"}
              </Badge>
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {screen.playlist_name ?? "No playlist assigned"}
            </p>
            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground/70">
              <Clock className="size-3" />
              {formatHeartbeat(screen.last_heartbeat_at)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ScreenEmptyState({ onPair }: { onPair: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Monitor className="mb-3 size-10 text-muted-foreground/40" />
      <p className="text-sm font-medium text-muted-foreground">
        No screens paired yet
      </p>
      <p className="mt-1 text-xs text-muted-foreground/70">
        Pair a screen to start displaying content.
      </p>
      <Button size="sm" className="mt-4" onClick={onPair}>
        <Plus className="mr-1.5 size-3.5" />
        Pair Screen
      </Button>
    </div>
  );
}

function ScreenGridSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
          <Skeleton className="mt-0.5 size-4" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivityList({ items }: { items: DashboardActivity[] }) {
  return (
    <div className="space-y-0">
      {items.map((item, i) => (
        <div key={item.id}>
          <div className="flex items-start gap-3 py-2.5">
            <div className="mt-1">
              {item.type === "announcement" ? (
                <Megaphone className="size-3.5 text-amber-500/70" />
              ) : (
                <Image className="size-3.5 text-blue-500/70" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-tight">{item.title}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {item.detail}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground/60">
                {formatHeartbeat(item.created_at)}
              </p>
            </div>
          </div>
          {i < items.length - 1 && <Separator className="my-0" />}
        </div>
      ))}
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="space-y-0">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i}>
          <div className="flex items-start gap-3 py-2.5">
            <Skeleton className="mt-1 size-3.5" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          {i < 4 && <Separator className="my-0" />}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fleet Health Card
// ---------------------------------------------------------------------------

function FleetHealthCard({
  fleet,
  onViewScreens,
}: {
  fleet: FleetHealth;
  onViewScreens: () => void;
}) {
  const onlineCount = fleet.screens.filter((s) => s.is_online).length;
  const total = fleet.screens.length;
  const onlinePct = total > 0 ? Math.round((onlineCount / total) * 100) : 0;

  // Bar chart data: one bar per screen showing free storage
  const storageData = fleet.screens
    .filter((s) => s.storage_total_mb !== null)
    .map((s) => ({
      name: s.name.length > 10 ? s.name.slice(0, 10) + "…" : s.name,
      free: s.storage_free_mb ?? 0,
      used: (s.storage_total_mb ?? 0) - (s.storage_free_mb ?? 0),
      isOnline: s.is_online,
    }));

  // Radial gauge data for online %
  const gaugeData = [{ value: onlinePct }];

  const usedStoragePct =
    fleet.totalStorageMb > 0
      ? Math.round(((fleet.totalStorageMb - fleet.freeStorageMb) / fleet.totalStorageMb) * 100)
      : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Fleet Health</CardTitle>
            <CardDescription>
              Live telemetry from all paired devices
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onViewScreens}>
            View screens
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 sm:grid-cols-3">
          {/* Online gauge */}
          <div className="flex flex-col items-center">
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              Screens Online
            </p>
            <div className="relative h-28 w-28">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  innerRadius="70%"
                  outerRadius="100%"
                  data={gaugeData}
                  startAngle={90}
                  endAngle={-270}
                >
                  <PolarAngleAxis
                    type="number"
                    domain={[0, 100]}
                    angleAxisId={0}
                    tick={false}
                  />
                  <RadialBar
                    background
                    dataKey="value"
                    cornerRadius={8}
                    fill="hsl(var(--primary))"
                    angleAxisId={0}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold">{onlinePct}%</span>
                <span className="text-[10px] text-muted-foreground">
                  {onlineCount}/{total}
                </span>
              </div>
            </div>
          </div>

          {/* Storage breakdown per screen */}
          {storageData.length > 0 ? (
            <div className="sm:col-span-2">
              <div className="mb-2 flex items-center gap-1.5">
                <HardDrive className="size-3.5 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">
                  Storage per screen — {usedStoragePct}% used fleet-wide
                </p>
              </div>
              <ResponsiveContainer width="100%" height={100}>
                <BarChart data={storageData} barSize={16} barGap={4}>
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 11 }}
                    formatter={(v, name) => [
                      `${v} MB`,
                      name === "free" ? "Free" : "Used",
                    ]}
                  />
                  <Bar dataKey="used" stackId="a" fill="hsl(var(--primary) / 0.3)" radius={0}>
                    {storageData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.isOnline ? "hsl(var(--primary) / 0.35)" : "hsl(var(--muted-foreground) / 0.2)"}
                      />
                    ))}
                  </Bar>
                  <Bar dataKey="free" stackId="a" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                    {storageData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.isOnline ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.4)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            /* WiFi summary if no storage data */
            <div className="flex flex-col justify-center sm:col-span-2 gap-3">
              <div className="flex items-center gap-2">
                <Wifi className="size-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Avg WiFi signal:{" "}
                  <span className="font-semibold text-foreground">
                    {fleet.avgWifiDbm !== null ? `${fleet.avgWifiDbm} dBm` : "No data yet"}
                  </span>
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Storage and WiFi charts will appear here once devices start sending heartbeats.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
