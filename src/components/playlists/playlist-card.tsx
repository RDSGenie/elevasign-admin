"use client";

import Link from "next/link";
import { format } from "date-fns";
import {
  ListMusic,
  Clock,
  Play,
  Edit,
  Copy,
  Trash2,
  MoreVertical,
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
import type { PlaylistWithStats, TransitionType } from "@/types/playlists";

const TRANSITION_LABELS: Record<TransitionType, string> = {
  crossfade: "Crossfade",
  slide_left: "Slide Left",
  slide_right: "Slide Right",
  fade: "Fade",
  none: "None",
};

function formatDuration(totalSeconds: number): string {
  if (totalSeconds === 0) return "0s";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0) parts.push(`${seconds}s`);
  return parts.join(" ");
}

interface PlaylistCardProps {
  playlist: PlaylistWithStats;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

export function PlaylistCard({
  playlist,
  onEdit,
  onDuplicate,
  onDelete,
}: PlaylistCardProps) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <ListMusic className="size-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate">
              <Link
                href={`/playlists/${playlist.id}`}
                className="hover:underline"
              >
                {playlist.name}
              </Link>
            </CardTitle>
            {playlist.description && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {playlist.description}
              </p>
            )}
          </div>
        </div>

        <CardAction>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon-xs" />
              }
            >
              <MoreVertical className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={() => onEdit(playlist.id)}
              >
                <Edit className="mr-2 size-3.5" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => onDuplicate(playlist.id)}
              >
                <Copy className="mr-2 size-3.5" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => onDelete(playlist.id)}
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
            <Play className="size-3" />
            {playlist.item_count} {playlist.item_count === 1 ? "item" : "items"}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" />
            {formatDuration(playlist.total_duration_seconds)}
          </span>
          <Badge
            variant={playlist.is_active ? "default" : "secondary"}
            className="text-[10px] px-1.5 py-0"
          >
            {playlist.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {TRANSITION_LABELS[playlist.transition_type]}
          </span>
          <span>{format(new Date(playlist.created_at), "MMM d, yyyy")}</span>
        </div>
      </CardContent>
    </Card>
  );
}
