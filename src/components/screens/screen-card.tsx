"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  Monitor,
  Wifi,
  WifiOff,
  MoreVertical,
  Edit,
  Trash2,
  Activity,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Screen } from "@/types/screens";

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  active: { label: "Active", variant: "default" },
  pending: { label: "Pending", variant: "outline" },
  inactive: { label: "Inactive", variant: "secondary" },
  maintenance: { label: "Maintenance", variant: "destructive" },
};

const LAYOUT_LABELS: Record<string, string> = {
  fullscreen: "Fullscreen",
  split_horizontal: "Split Horizontal",
  split_vertical: "Split Vertical",
  grid_2x2: "Grid 2x2",
  main_with_sidebar: "Main + Sidebar",
  main_with_ticker: "Main + Ticker",
};

interface ScreenCardProps {
  screen: Screen;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ScreenCard({ screen, onEdit, onDelete }: ScreenCardProps) {
  const statusConfig = STATUS_CONFIG[screen.status] ?? STATUS_CONFIG.pending;
  const heartbeatText = screen.last_heartbeat_at
    ? formatDistanceToNow(new Date(screen.last_heartbeat_at), {
        addSuffix: true,
      })
    : "Never";

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div
            className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
              screen.is_online
                ? "bg-green-500/10"
                : "bg-muted"
            }`}
          >
            <Monitor
              className={`size-4 ${
                screen.is_online
                  ? "text-green-600"
                  : "text-muted-foreground"
              }`}
            />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate">
              <Link
                href={`/screens/${screen.id}`}
                className="hover:underline"
              >
                {screen.name}
              </Link>
            </CardTitle>
            <div className="mt-1 flex items-center gap-2">
              <Badge
                variant={statusConfig.variant}
                className="text-[10px] px-1.5 py-0"
              >
                {statusConfig.label}
              </Badge>
              {screen.is_online ? (
                <span className="inline-flex items-center gap-1 text-xs text-green-600">
                  <Wifi className="size-3" />
                  Online
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <WifiOff className="size-3" />
                  Offline
                </span>
              )}
            </div>
          </div>
        </div>

        <CardAction>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon-xs" />}
            >
              <MoreVertical className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(screen.id)}>
                <Edit className="mr-2 size-3.5" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(screen.id)}
              >
                <Trash2 className="mr-2 size-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>

      <CardContent>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Activity className="size-3" />
            {heartbeatText}
          </span>
          <span>
            {LAYOUT_LABELS[screen.layout_template] ?? screen.layout_template}
          </span>
        </div>

        {/* Device info */}
        {(screen.screen_resolution || screen.orientation) && (
          <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
            {screen.screen_resolution && (
              <span>{screen.screen_resolution}</span>
            )}
            {screen.orientation && (
              <span className="capitalize">{screen.orientation}</span>
            )}
            {screen.app_version && (
              <span>v{screen.app_version}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
