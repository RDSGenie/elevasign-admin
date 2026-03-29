"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import {
  BarChart3,
  Monitor,
  Clock,
  CheckCircle2,
  XCircle,
  Film,
  Image as ImageIcon,
  ChevronDown,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlayLog {
  id: string;
  screen_id: string;
  media_item_id: string | null;
  playlist_id: string | null;
  played_at: string;
  duration_ms: number | null;
  completed: boolean;
  screens: { name: string; location: string | null } | null;
  media_items: { name: string; file_type: string } | null;
  playlists: { name: string } | null;
}

interface Screen {
  id: string;
  name: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMs(ms: number | null): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function isVideo(fileType: string | undefined): boolean {
  return !!fileType?.startsWith("video/");
}

const DATE_PRESETS = [
  { label: "Last 24h", days: 1 },
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AnalyticsPage() {
  const supabase = createClient();
  const [days, setDays] = useState(7);
  const [screenFilter, setScreenFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const since = startOfDay(subDays(new Date(), days)).toISOString();
  const until = endOfDay(new Date()).toISOString();

  // Fetch all screens for filter dropdown
  const { data: screens = [] } = useQuery<Screen[]>({
    queryKey: ["screens-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("screens")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch play logs
  const { data: logs = [], isLoading } = useQuery<PlayLog[]>({
    queryKey: ["play-logs", days, screenFilter, page],
    queryFn: async () => {
      let query = supabase
        .from("play_logs")
        .select(
          `id, screen_id, media_item_id, playlist_id, played_at, duration_ms, completed,
           screens(name, location),
           media_items(name, file_type),
           playlists(name)`
        )
        .gte("played_at", since)
        .lte("played_at", until)
        .order("played_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (screenFilter !== "all") {
        query = query.eq("screen_id", screenFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as PlayLog[];
    },
  });

  // Stats
  const stats = useMemo(() => {
    const totalPlays = logs.length;
    const completedPlays = logs.filter((l) => l.completed).length;
    const totalMs = logs.reduce((sum, l) => sum + (l.duration_ms ?? 0), 0);
    const uniqueScreens = new Set(logs.map((l) => l.screen_id)).size;
    const completionRate =
      totalPlays > 0 ? Math.round((completedPlays / totalPlays) * 100) : 0;

    // Top media
    const mediaCounts: Record<string, { name: string; count: number; type: string }> = {};
    for (const log of logs) {
      if (log.media_item_id && log.media_items) {
        if (!mediaCounts[log.media_item_id]) {
          mediaCounts[log.media_item_id] = {
            name: log.media_items.name,
            count: 0,
            type: log.media_items.file_type,
          };
        }
        mediaCounts[log.media_item_id].count++;
      }
    }
    const topMedia = Object.values(mediaCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return { totalPlays, completedPlays, completionRate, totalMs, uniqueScreens, topMedia };
  }, [logs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <BarChart3 className="size-5" />
            Proof of Play
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Playback history and media delivery confirmation
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Date range */}
          <div className="flex rounded-md border">
            {DATE_PRESETS.map((preset) => (
              <button
                key={preset.days}
                type="button"
                onClick={() => { setDays(preset.days); setPage(0); }}
                className={`px-3 py-1.5 text-xs font-medium transition-colors first:rounded-l-md last:rounded-r-md ${
                  days === preset.days
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Screen filter */}
          <Select
            value={screenFilter}
            onValueChange={(v) => { setScreenFilter(v); setPage(0); }}
          >
            <SelectTrigger className="h-8 w-44 text-xs">
              <Monitor className="size-3.5 mr-1.5 shrink-0" />
              <SelectValue placeholder="All screens" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All screens</SelectItem>
              {screens.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total Plays</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">
            {isLoading ? <Skeleton className="h-8 w-16" /> : stats.totalPlays.toLocaleString()}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Completion Rate</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">
            {isLoading ? <Skeleton className="h-8 w-16" /> : `${stats.completionRate}%`}
          </p>
          <p className="text-xs text-muted-foreground">{stats.completedPlays} completed</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total Airtime</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">
            {isLoading ? <Skeleton className="h-8 w-16" /> : formatMs(stats.totalMs)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Active Screens</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">
            {isLoading ? <Skeleton className="h-8 w-16" /> : stats.uniqueScreens}
          </p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* Play log table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Playback Log</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <BarChart3 className="mb-3 size-10 text-muted-foreground/30" />
                <p className="text-sm font-medium">No play data yet</p>
                <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                  Play logs appear here once the Android player starts reporting playback.
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Time</th>
                        <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Screen</th>
                        <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Media</th>
                        <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Playlist</th>
                        <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Duration</th>
                        <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-muted/30">
                          <td className="px-4 py-2.5 font-mono text-muted-foreground whitespace-nowrap">
                            {format(new Date(log.played_at), "MMM d, HH:mm")}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <Monitor className="size-3 shrink-0 text-muted-foreground" />
                              <span className="max-w-[120px] truncate">
                                {log.screens?.name ?? "—"}
                              </span>
                            </div>
                            {log.screens?.location && (
                              <p className="mt-0.5 text-muted-foreground truncate max-w-[120px]">
                                {log.screens.location}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1.5">
                              {isVideo(log.media_items?.file_type) ? (
                                <Film className="size-3 shrink-0 text-muted-foreground" />
                              ) : (
                                <ImageIcon className="size-3 shrink-0 text-muted-foreground" />
                              )}
                              <span className="max-w-[160px] truncate">
                                {log.media_items?.name ?? "—"}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground max-w-[120px] truncate">
                            {log.playlists?.name ?? "—"}
                          </td>
                          <td className="px-4 py-2.5 font-mono tabular-nums text-muted-foreground whitespace-nowrap">
                            {formatMs(log.duration_ms)}
                          </td>
                          <td className="px-4 py-2.5">
                            {log.completed ? (
                              <Badge variant="default" className="gap-1 bg-green-600 text-[10px]">
                                <CheckCircle2 className="size-2.5" />
                                Done
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="gap-1 text-[10px]">
                                <XCircle className="size-2.5" />
                                Partial
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Pagination */}
                <div className="flex items-center justify-between border-t px-4 py-3">
                  <p className="text-xs text-muted-foreground">
                    Showing {page * PAGE_SIZE + 1}–{page * PAGE_SIZE + logs.length}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page === 0}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={logs.length < PAGE_SIZE}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Top media sidebar */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock className="size-4" />
              Top Media
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : stats.topMedia.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                No data yet
              </p>
            ) : (
              <div className="space-y-2">
                {stats.topMedia.map((media, i) => (
                  <div
                    key={media.name}
                    className="flex items-center gap-3 rounded-md border px-3 py-2"
                  >
                    <span className="w-4 text-xs font-bold text-muted-foreground">
                      {i + 1}
                    </span>
                    {isVideo(media.type) ? (
                      <Film className="size-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ImageIcon className="size-4 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{media.name}</p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 tabular-nums text-[10px]">
                      {media.count}x
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
