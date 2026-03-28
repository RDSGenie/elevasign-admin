"use client";

import { use, useState } from "react";
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
} from "lucide-react";
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
import { createClient } from "@/lib/supabase/client";
import {
  getScreen,
  updateScreen,
  getDeviceHeartbeats,
} from "@/lib/supabase/screen-queries";
import type { LayoutTemplate } from "@/types/screens";

const LAYOUT_OPTIONS: {
  value: LayoutTemplate;
  label: string;
  icon: React.ElementType;
}[] = [
  { value: "fullscreen", label: "Fullscreen", icon: Maximize },
  { value: "split_horizontal", label: "Split Horizontal", icon: Columns2 },
  { value: "split_vertical", label: "Split Vertical", icon: Rows2 },
  { value: "grid_2x2", label: "Grid 2x2", icon: LayoutGrid },
  { value: "main_with_sidebar", label: "Main + Sidebar", icon: PanelLeft },
  {
    value: "main_with_ticker",
    label: "Main + Ticker",
    icon: GalleryHorizontalEnd,
  },
];

const REMOTE_COMMANDS = [
  {
    command: "restart_app",
    label: "Restart App",
    icon: RefreshCw,
    variant: "outline" as const,
  },
  {
    command: "reboot",
    label: "Reboot Device",
    icon: Power,
    variant: "outline" as const,
  },
  {
    command: "force_sync",
    label: "Force Sync",
    icon: RefreshCw,
    variant: "outline" as const,
  },
  {
    command: "clear_cache",
    label: "Clear Cache",
    icon: Trash2,
    variant: "destructive" as const,
  },
];

export default function ScreenDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  // Local editable state
  const [editedName, setEditedName] = useState<string | null>(null);
  const [editedLayout, setEditedLayout] = useState<LayoutTemplate | null>(null);

  // Fetch screen
  const {
    data: screen,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["screen", id],
    queryFn: () => {
      const supabase = createClient();
      return getScreen(supabase, id);
    },
  });

  // Fetch heartbeats
  const { data: heartbeats = [] } = useQuery({
    queryKey: ["screen-heartbeats", id],
    queryFn: () => {
      const supabase = createClient();
      return getDeviceHeartbeats(supabase, id);
    },
    enabled: !!screen,
  });

  // Derived values
  const effectiveName = editedName ?? screen?.name ?? "";
  const effectiveLayout =
    editedLayout ?? screen?.layout_template ?? "fullscreen";

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      return updateScreen(supabase, id, {
        name: effectiveName,
        layout_template: effectiveLayout,
      });
    },
    onSuccess: () => {
      toast.success("Screen updated");
      queryClient.invalidateQueries({ queryKey: ["screen", id] });
      queryClient.invalidateQueries({ queryKey: ["screens"] });
      setEditedName(null);
      setEditedLayout(null);
    },
    onError: (err: Error) => {
      toast.error(`Failed to save: ${err.message}`);
    },
  });

  // Command handler (placeholder -- sends toast for now)
  function handleCommand(command: string) {
    toast.info(`Command "${command}" would be sent to the device.`);
  }

  // Loading state
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

  // Error state
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
          <p className="text-sm text-destructive">
            Failed to load screen. It may have been deleted.
          </p>
        </div>
      </div>
    );
  }

  const hasChanges = editedName !== null || editedLayout !== null;

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
            {saveMutation.isPending ? "Saving..." : "Save"}
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-6">
          {/* Device Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Device Information</CardTitle>
              <CardDescription>
                Hardware and software details for this screen.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Device ID
                  </Label>
                  <p className="mt-0.5 font-mono text-xs">
                    {screen.device_id ?? "Not paired"}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    App Version
                  </Label>
                  <p className="mt-0.5">
                    {screen.app_version
                      ? `v${screen.app_version}`
                      : "Unknown"}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    OS Version
                  </Label>
                  <p className="mt-0.5">{screen.os_version ?? "Unknown"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Resolution
                  </Label>
                  <p className="mt-0.5">
                    {screen.screen_resolution ?? "Unknown"}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Orientation
                  </Label>
                  <p className="mt-0.5 capitalize">{screen.orientation}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Last Heartbeat
                  </Label>
                  <p className="mt-0.5">
                    {screen.last_heartbeat_at
                      ? formatDistanceToNow(
                          new Date(screen.last_heartbeat_at),
                          { addSuffix: true }
                        )
                      : "Never"}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Last Sync
                  </Label>
                  <p className="mt-0.5">
                    {screen.last_sync_at
                      ? formatDistanceToNow(new Date(screen.last_sync_at), {
                          addSuffix: true,
                        })
                      : "Never"}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Status
                  </Label>
                  <p className="mt-0.5 capitalize">{screen.status}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Layout Template */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Layout Template</CardTitle>
              <CardDescription>
                Choose how content is displayed on this screen.
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                    onClick={() => setEditedLayout(value)}
                  >
                    <Icon className="size-5" />
                    <span className="font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Remote Commands */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Remote Commands</CardTitle>
              <CardDescription>
                Send commands to this screen device.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {REMOTE_COMMANDS.map(
                  ({ command, label, icon: Icon, variant }) => (
                    <Button
                      key={command}
                      variant={variant}
                      size="sm"
                      className="justify-start gap-2"
                      onClick={() => handleCommand(command)}
                    >
                      <Icon className="size-3.5" />
                      {label}
                    </Button>
                  )
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Heartbeats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Activity className="size-4" />
                Recent Heartbeats
              </CardTitle>
              <CardDescription>
                Latest device health reports.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {heartbeats.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-6">
                  No heartbeat data available yet.
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
                      {heartbeats.slice(0, 10).map((hb) => (
                        <tr key={hb.id}>
                          <td className="py-1.5">
                            {format(
                              new Date(hb.created_at),
                              "MMM d, HH:mm"
                            )}
                          </td>
                          <td className="py-1.5">
                            {hb.wifi_signal !== null
                              ? `${hb.wifi_signal} dBm`
                              : "-"}
                          </td>
                          <td className="py-1.5">
                            {hb.storage_free_mb !== null
                              ? `${hb.storage_free_mb} MB`
                              : "-"}
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
