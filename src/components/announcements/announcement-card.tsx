"use client";

import { format } from "date-fns";
import {
  Megaphone,
  Monitor,
  Maximize,
  MoveHorizontal,
  Edit,
  Trash2,
  MoreVertical,
  Clock,
  Power,
  PowerOff,
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
import type { Announcement, DisplayType } from "@/types/announcements";

const DISPLAY_TYPE_LABELS: Record<DisplayType, string> = {
  overlay: "Overlay",
  fullscreen: "Fullscreen",
  ticker: "Ticker",
};

const DISPLAY_TYPE_ICONS: Record<DisplayType, React.ElementType> = {
  overlay: Monitor,
  fullscreen: Maximize,
  ticker: MoveHorizontal,
};

function isExpired(announcement: Announcement): boolean {
  if (!announcement.expires_at) return false;
  return new Date(announcement.expires_at) < new Date();
}

function isScheduledFuture(announcement: Announcement): boolean {
  if (!announcement.starts_at) return false;
  return new Date(announcement.starts_at) > new Date();
}

interface AnnouncementCardProps {
  announcement: Announcement;
  onEdit: (announcement: Announcement) => void;
  onToggleActive: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}

export function AnnouncementCard({
  announcement,
  onEdit,
  onToggleActive,
  onDelete,
}: AnnouncementCardProps) {
  const expired = isExpired(announcement);
  const scheduled = isScheduledFuture(announcement);
  const isLive = announcement.is_active && !expired && !scheduled;
  const DisplayIcon = DISPLAY_TYPE_ICONS[announcement.display_type];

  return (
    <Card
      className="transition-shadow hover:shadow-md"
      style={{
        borderLeftWidth: "4px",
        borderLeftColor: isLive ? announcement.bg_color : undefined,
        opacity: expired ? 0.6 : 1,
      }}
    >
      <CardHeader>
        <div className="flex items-start gap-3">
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-lg"
            style={{
              backgroundColor: `${announcement.bg_color}20`,
            }}
          >
            <Megaphone
              className="size-4"
              style={{ color: announcement.bg_color }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate">{announcement.title}</CardTitle>
            {announcement.body && (
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                {announcement.body}
              </p>
            )}
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
              <DropdownMenuItem onClick={() => onEdit(announcement)}>
                <Edit className="mr-2 size-3.5" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  onToggleActive(announcement.id, !announcement.is_active)
                }
              >
                {announcement.is_active ? (
                  <>
                    <PowerOff className="mr-2 size-3.5" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <Power className="mr-2 size-3.5" />
                    Activate
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(announcement.id)}
              >
                <Trash2 className="mr-2 size-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>

      <CardContent>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
          {/* Display type badge */}
          <Badge variant="secondary" className="gap-1 text-[10px] px-1.5 py-0">
            <DisplayIcon className="size-2.5" />
            {DISPLAY_TYPE_LABELS[announcement.display_type]}
          </Badge>

          {/* Color preview */}
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block size-3.5 rounded-sm border"
              style={{
                backgroundColor: announcement.bg_color,
                borderColor: `${announcement.bg_color}80`,
              }}
            />
            <span
              className="inline-block size-3.5 rounded-sm border"
              style={{
                backgroundColor: announcement.text_color,
                borderColor:
                  announcement.text_color === "#FFFFFF"
                    ? "#e5e7eb"
                    : `${announcement.text_color}80`,
              }}
            />
          </span>

          {/* Status badge */}
          {isLive ? (
            <Badge
              variant="default"
              className="bg-green-600 text-[10px] px-1.5 py-0"
            >
              Live
            </Badge>
          ) : expired ? (
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0"
            >
              Expired
            </Badge>
          ) : scheduled ? (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0"
            >
              Scheduled
            </Badge>
          ) : !announcement.is_active ? (
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0"
            >
              Inactive
            </Badge>
          ) : null}

          {/* Target screens */}
          <span className="inline-flex items-center gap-1">
            <Monitor className="size-3" />
            {announcement.target_screens?.length
              ? `${announcement.target_screens.length} screen${announcement.target_screens.length === 1 ? "" : "s"}`
              : "All screens"}
          </span>
        </div>

        {/* Time info */}
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" />
            {announcement.starts_at
              ? format(new Date(announcement.starts_at), "MMM d, yyyy HH:mm")
              : "Immediate"}
          </span>
          <span>
            {announcement.expires_at
              ? `Expires ${format(new Date(announcement.expires_at), "MMM d, HH:mm")}`
              : "No expiration"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
