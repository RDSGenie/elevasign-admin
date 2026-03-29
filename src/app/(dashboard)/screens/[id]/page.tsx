"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import {
  ChevronLeft,
  Save,
  Loader2,
  Monitor,
  Wifi,
  WifiOff,
  HardDrive,
  RefreshCw,
  Power,
  Trash2,
  Activity,
  Maximize,
  Columns2,
  Rows2,
  LayoutGrid,
  PanelLeft,
  GalleryHorizontalEnd,
  Layers,
  Terminal,
  Check,
  X,
  Clock,
} from "lucide-react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { createClient } from "@/lib/supabase/client";
import {
  getScreen,
  updateScreen,
  deleteScreen,
  getDeviceHeartbeats,
  sendDeviceCommand,
  getDeviceCommands,
  getLayoutZones,
  saveLayoutZones,
  LAYOUT_ZONE_DEFINITIONS,
} from "@/lib/supabase/screen-queries";
import { getPlaylists } from "@/lib/supabase/playlist-queries";
import type { LayoutTemplate } from "@/types/screens";

const LAYOUT_OPTIONS: {
  value: LayoutTemplate;
  label: string;
  icon: React.ElementType;
}[] = [
  { value: "fullscreen", label: "Fullscreen", icon: Maximize },
  { value: "split_horizontal", label: "Split H", icon: Columns2 },
  { value: "split_vertical", label: "Split V", icon: Rows2 },
  { value: "grid_2x2", label: "Grid 2×2", icon: LayoutGrid },
  { value: "main_with_sidebar", label: "Main+Side", icon: PanelLeft },
  {
    value: "main_with_ticker",
    label: "Main+Ticker",
    icon: GalleryHorizontalEnd,
  },
];

const REMOTE_COMMANDS = [
  { command: "force_sync", label: "Force Sync", icon: RefreshCw },
  { command: "restart_app", label: "Restart App", icon: Terminal },
  { command: "reboot_device", label: "Reboot", icon: Power },
  { command: "clear_cache", label: "Clear Cache", icon: Trash2 },
];

const COMMAND_STATUS_COLOR: Record<string, string> = {
  pending: "text-yellow-500",
  executing: "text-blue-500",
  completed: "text-green-500",
  failed: "text-red-500",
};

function wifiQuality(dbm: number | null): string {
  if (dbm === null) return "—";
  if (dbm >= -50) return "Excellent";
  if (dbm >= -70) return "Good";
  if (dbm >= -80) return "Fair";
  return "Poor";
}

export default function ScreenDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const supabase = createClient();

  const [editedName, setEditedName] = useState<string | null>(null);
  const [editedLocation, setEditedLocation] = useState<string | null>(null);
  const [editedOrientation, setEditedOrientation] = useState<"landscape" | "portrait" | null>(null);
  const [editedLayout, setEditedLayout] = useState<LayoutTemplate | null>(null);
  const [zoneAssignments, setZoneAssignments] = useState<
    Record<string, string | null>
  >({});
  const [zonesChanged, setZonesChanged] = useState(false);

  const {
    data: screen,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["screen", id],
    queryFn: () => getScreen(supabase, id),
    refetchInterval: 30_000,
  });

  const { data: heartbeats = [] } = useQuery({
    queryKey: ["heartbeats", id],
    queryFn: () => getDeviceHeartbeats(supabase, id, 24),
    refetchInterval: 60_000,
  });

  const { data: commands = [] } = useQuery({
    queryKey: ["commands", id],
    queryFn: () => getDeviceCommands(supabase, id, 5),
    refetchInterval: 15_000,
  });

  const { data: zones = [] } = useQuery({
    queryKey: ["zones", id],
    queryFn: () => getLayoutZones(supabase, id),
  });

  useEffect(() => {
    if (zones.length === 0) return;
    const map: Record<string, string | null> = {};
    zones.forEach((z) => { map[z.zone_name] = z.playlist_id; });
    setZoneAssignments(map);
  }, [zones]);

  const { data: playlists = [] } = useQuery({
    queryKey: ["playlists"],
    queryFn: () => getPlaylists(supabase),
  });

  const effectiveName = editedName ?? screen?.name ?? "";
  const effectiveLocation = editedLocation ?? screen?.location ?? "";
  const effectiveOrientation = editedOrientation ?? screen?.orientation ?? "landscape";
  const effectiveLayout =
    editedLayout ?? screen?.layout_template ?? "fullscreen";
  const zoneDefs = LAYOUT_ZONE_DEFINITIONS[effectiveLayout] ?? [];

  const chartData = [...heartbeats].reverse().map((hb, i) => ({
    i,
    wifi: hb.wifi_signal,
    storage: hb.storage_free_mb,
  }));

  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates: Parameters<typeof updateScreen>[2] = {};
      if (editedName !== null) updates.name = editedName;
      if (editedLocation !== undefined) updates.location = editedLocation;
      if (editedOrientation !== null) updates.orientation = editedOrientation;
      if (editedLayout !== null) updates.layout_template = editedLayout;
      if (Object.keys(updates).length > 0) {
        await updateScreen(supabase, id, updates);
      }
      if (zonesChanged) {
        await saveLayoutZones(supabase, id, effectiveLayout, zoneAssignments);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["screen", id] });
      qc.invalidateQueries({ queryKey: ["zones", id] });
      setEditedName(null);
      setEditedLocation(null);
      setEditedOrientation(null);
      setEditedLayout(null);
      setZonesChanged(false);
      toast.success("Screen saved.");
    },
    onError: (err: Error) => toast.error(`Failed to save: ${err.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteScreen(supabase, id),
    onSuccess: () => {
      toast.success("Screen deleted.");
      router.push("/screens");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const commandMutation = useMutation({
    mutationFn: (command: string) => sendDeviceCommand(supabase, id, command),
    onSuccess: (_, command) => {
      qc.invalidateQueries({ queryKey: ["commands", id] });
      toast.success(`Command "${command}" queued.`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleZoneChange(zoneName: string, playlistId: string | null) {
    setZoneAssignments((prev) => ({ ...prev, [zoneName]: playlistId }));
    setZonesChanged(true);
  }

  function handleLayoutChange(layout: LayoutTemplate) {
    setEditedLayout(layout);
    setZoneAssignments({});
    setZonesChanged(true);
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-[400px] rounded-xl" />
          <Skeleton className="h-[400px] rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !screen) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/screens")}
        >
          <ChevronLeft data-icon="inline-start" />
          Back to Screens
        </Button>
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center">
          <p className="text-sm text-destructive">Failed to load screen.</p>
        </div>
      </div>
    );
  }

  const hasChanges =
    editedName !== null || editedLocation !== null || editedOrientation !== null || editedLayout !== null || zonesChanged;
  const latestHb = heartbeats[0] ?? null;

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/screens")}
        >
          <ChevronLeft data-icon="inline-start" />
          Screens
        </Button>

        <div className="flex flex-1 items-center gap-3 overflow-hidden">
          <Input
            value={effectiveName}
            onChange={(e) => setEditedName(e.target.value)}
            className="h-8 max-w-xs text-base font-semibold"
            placeholder="Screen name"
          />
          {screen.is_online ? (
            <Badge variant="default" className="shrink-0 bg-green-600">
              <Wifi className="mr-1 size-3" />
              Online
            </Badge>
          ) : (
            <Badge variant="secondary" className="shrink-0">
              <WifiOff className="mr-1 size-3" />
              Offline
            </Badge>
          )}
        </div>

        <div className="flex gap-2">
          {hasChanges && (
            <Button
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <Loader2
                  className="size-3.5 animate-spin"
                  data-icon="inline-start"
                />
              ) : (
                <Save className="size-3.5" data-icon="inline-start" />
              )}
              {saveMutation.isPending ? "Saving…" : "Save"}
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger>
              <Button variant="outline" size="sm">
                <Trash2
                  className="size-3.5 text-destructive"
                  data-icon="inline-start"
                />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this screen?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete &quot;{screen.name}&quot; and
                  all its data. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => deleteMutation.mutate()}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Stats strip (only when heartbeat data exists) */}
      {latestHb && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">WiFi Signal</p>
            <p className="mt-1 text-lg font-semibold">
              {latestHb.wifi_signal ?? "—"}{" "}
              <span className="text-xs font-normal">dBm</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {wifiQuality(latestHb.wifi_signal)}
            </p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Free Storage</p>
            <p className="mt-1 text-lg font-semibold">
              {latestHb.storage_free_mb ?? "—"}{" "}
              <span className="text-xs font-normal">MB</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {latestHb.storage_free_mb !== null &&
              latestHb.storage_free_mb < 1000
                ? "Low"
                : "OK"}
            </p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Last Heartbeat</p>
            <p className="mt-1 text-sm font-semibold">
              {screen.last_heartbeat_at
                ? formatDistanceToNow(new Date(screen.last_heartbeat_at), {
                    addSuffix: true,
                  })
                : "Never"}
            </p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Last Sync</p>
            <p className="mt-1 text-sm font-semibold">
              {screen.last_sync_at
                ? formatDistanceToNow(new Date(screen.last_sync_at), {
                    addSuffix: true,
                  })
                : "Never"}
            </p>
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Left column ──────────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Device Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Monitor className="size-4" />
                Device Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Editable fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Location</Label>
                  <Input
                    value={effectiveLocation}
                    onChange={(e) => setEditedLocation(e.target.value)}
                    placeholder="e.g. Floor 3 – East Elevator"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Orientation</Label>
                  <Select
                    value={effectiveOrientation}
                    onValueChange={(v) => setEditedOrientation(v as "landscape" | "portrait")}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="landscape">Landscape</SelectItem>
                      <SelectItem value="portrait">Portrait</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <p className="mt-1.5 font-mono text-xs capitalize">{screen.status}</p>
                </div>
              </div>
              {/* Read-only device details */}
              <div className="grid grid-cols-2 gap-3 border-t pt-3 text-xs">
                {(
                  [
                    ["Device ID", screen.device_id ? screen.device_id.slice(0, 16) + "…" : "Not paired"],
                    ["App Version", screen.app_version ? `v${screen.app_version}` : "—"],
                    ["OS Version", screen.os_version ?? "—"],
                    ["Resolution", screen.screen_resolution ?? "—"],
                  ] as [string, string][]
                ).map(([label, value]) => (
                  <div key={label}>
                    <Label className="text-xs text-muted-foreground">{label}</Label>
                    <p className="mt-0.5 font-mono text-xs">{value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Layout Template + Zone Editor */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Layers className="size-4" />
                Layout &amp; Zones
              </CardTitle>
              <CardDescription>
                Choose a template then assign a playlist to each zone.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Template selector */}
              <div className="grid grid-cols-3 gap-2">
                {LAYOUT_OPTIONS.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center text-xs transition-colors ${
                      effectiveLayout === value
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:border-primary/30 hover:bg-muted/50"
                    }`}
                    onClick={() => handleLayoutChange(value)}
                  >
                    <Icon className="size-5" />
                    <span className="font-medium leading-tight">{label}</span>
                  </button>
                ))}
              </div>

              {/* Visual preview + playlist assignment */}
              {zoneDefs.length > 0 && (
                <div className="space-y-3">
                  <Separator />
                  {/* Zone preview */}
                  <div className="relative h-24 w-full overflow-hidden rounded-md border bg-muted">
                    {zoneDefs.map((def) => (
                      <div
                        key={def.zone_name}
                        className="absolute flex items-center justify-center border border-primary/40 bg-primary/5 text-[10px] font-medium text-primary"
                        style={{
                          left: `${def.position_x_percent}%`,
                          top: `${def.position_y_percent}%`,
                          width: `${def.width_percent}%`,
                          height: `${def.height_percent}%`,
                        }}
                      >
                        {def.label}
                      </div>
                    ))}
                  </div>

                  {/* Per-zone playlist select */}
                  <div className="space-y-2">
                    {zoneDefs.map((def) => (
                      <div
                        key={def.zone_name}
                        className="flex items-center gap-2"
                      >
                        <span className="w-28 shrink-0 text-xs font-medium">
                          {def.label}
                        </span>
                        <Select
                          value={zoneAssignments[def.zone_name] ?? "none"}
                          onValueChange={(v) =>
                            handleZoneChange(
                              def.zone_name,
                              v === "none" ? null : v
                            )
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="No playlist" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              <span className="text-muted-foreground">
                                No playlist
                              </span>
                            </SelectItem>
                            {playlists.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right column ─────────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Health Sparklines */}
          {chartData.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Activity className="size-4" />
                  Health Trends
                  <span className="ml-auto text-xs font-normal text-muted-foreground">
                    last {chartData.length} readings
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Wifi className="size-3" /> WiFi Signal (dBm)
                  </p>
                  <ResponsiveContainer width="100%" height={60}>
                    <LineChart data={chartData}>
                      <YAxis domain={[-100, -30]} hide />
                      <Tooltip
                        contentStyle={{ fontSize: 11 }}
                        formatter={(v) => [`${v} dBm`, "WiFi"]}
                        labelFormatter={() => ""}
                      />
                      <Line
                        type="monotone"
                        dataKey="wifi"
                        stroke="hsl(var(--primary))"
                        strokeWidth={1.5}
                        dot={false}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <p className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <HardDrive className="size-3" /> Free Storage (MB)
                  </p>
                  <ResponsiveContainer width="100%" height={60}>
                    <LineChart data={chartData}>
                      <YAxis domain={[0, "auto"]} hide />
                      <Tooltip
                        contentStyle={{ fontSize: 11 }}
                        formatter={(v) => [`${v} MB`, "Free"]}
                        labelFormatter={() => ""}
                      />
                      <Line
                        type="monotone"
                        dataKey="storage"
                        stroke="hsl(var(--primary))"
                        strokeWidth={1.5}
                        dot={false}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Remote Commands */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Terminal className="size-4" />
                Remote Commands
              </CardTitle>
              <CardDescription>
                Queued and picked up on next device heartbeat.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {REMOTE_COMMANDS.map(({ command, label, icon: Icon }) => (
                  <Button
                    key={command}
                    variant="outline"
                    size="sm"
                    className="justify-start gap-2"
                    disabled={commandMutation.isPending}
                    onClick={() => commandMutation.mutate(command)}
                  >
                    <Icon className="size-3.5" />
                    {label}
                  </Button>
                ))}
              </div>

              {commands.length > 0 && (
                <>
                  <Separator />
                  <p className="text-xs font-medium text-muted-foreground">
                    Recent
                  </p>
                  <div className="space-y-1.5">
                    {commands.map((cmd) => (
                      <div
                        key={cmd.id}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="font-mono">{cmd.command}</span>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <span
                            className={
                              COMMAND_STATUS_COLOR[cmd.status] ?? ""
                            }
                          >
                            {cmd.status === "completed" ? (
                              <Check className="size-3" />
                            ) : cmd.status === "failed" ? (
                              <X className="size-3" />
                            ) : (
                              <Clock className="size-3" />
                            )}
                          </span>
                          {formatDistanceToNow(new Date(cmd.created_at), {
                            addSuffix: true,
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Heartbeat table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Activity className="size-4" />
                Recent Heartbeats
              </CardTitle>
            </CardHeader>
            <CardContent>
              {heartbeats.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  No data yet. Pair a device to start collecting health
                  telemetry.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="pb-2 text-left font-medium text-muted-foreground">
                          Time
                        </th>
                        <th className="pb-2 text-left font-medium text-muted-foreground">
                          WiFi
                        </th>
                        <th className="pb-2 text-left font-medium text-muted-foreground">
                          Storage
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {heartbeats.slice(0, 8).map((hb) => (
                        <tr key={hb.id}>
                          <td className="py-1.5">
                            {format(new Date(hb.created_at), "MMM d, HH:mm")}
                          </td>
                          <td className="py-1.5">
                            {hb.wifi_signal !== null
                              ? `${hb.wifi_signal} dBm`
                              : "—"}
                          </td>
                          <td className="py-1.5">
                            {hb.storage_free_mb !== null
                              ? `${hb.storage_free_mb} MB`
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
