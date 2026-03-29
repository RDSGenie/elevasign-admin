"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Image, Play, X, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import type { PlaylistItemWithMedia } from "@/types/playlists";

function isVideoType(fileType: string): boolean {
  return fileType.startsWith("video/");
}

function formatSeconds(s: number): string {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const remainder = s % 60;
  return remainder > 0 ? `${m}m ${remainder}s` : `${m}m`;
}

interface PlaylistItemRowProps {
  item: PlaylistItemWithMedia;
  onRemove: (id: string) => void;
  onToggleEnabled: (id: string, enabled: boolean) => void;
  onDurationChange: (id: string, duration: number) => void;
}

export function PlaylistItemRow({
  item,
  onRemove,
  onToggleEnabled,
  onDurationChange,
}: PlaylistItemRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const media = item.media_item;
  const isVideo = isVideoType(media.file_type);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-3 rounded-lg border bg-card p-3 transition-shadow",
        isDragging && "z-50 shadow-lg ring-2 ring-primary/20",
        !item.is_enabled && "opacity-60"
      )}
    >
      {/* Drag handle */}
      <button
        type="button"
        className="flex shrink-0 cursor-grab touch-none items-center text-muted-foreground hover:text-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>

      {/* Thumbnail */}
      <div className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
        {media.thumbnail_path ? (
          <img
            src={media.thumbnail_path}
            alt={media.name}
            className="size-full object-cover"
          />
        ) : isVideo ? (
          <Film className="size-4 text-muted-foreground" />
        ) : (
          <Image className="size-4 text-muted-foreground" />
        )}
        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Play className="size-3 fill-white text-white" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-tight">
          {media.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {isVideo ? "Video" : "Image"}
          {media.width && media.height && ` \u00B7 ${media.width}x${media.height}`}
        </p>
      </div>

      {/* Duration control */}
      <div className="hidden w-36 shrink-0 items-center gap-2 sm:flex">
        {isVideo && media.duration_seconds ? (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatSeconds(media.duration_seconds)}
          </span>
        ) : (
          <>
            <Slider
              min={5}
              max={60}
              value={[item.display_duration_seconds]}
              onValueChange={(val) =>
                onDurationChange(item.id, Array.isArray(val) ? val[0] : val)
              }
              className="flex-1"
            />
            <span className="w-7 text-right text-xs tabular-nums text-muted-foreground">
              {item.display_duration_seconds}s
            </span>
          </>
        )}
      </div>

      {/* Enabled toggle */}
      <Switch
        size="sm"
        checked={item.is_enabled}
        onCheckedChange={(checked) => onToggleEnabled(item.id, checked)}
      />

      {/* Remove */}
      <Button
        variant="ghost"
        size="icon-xs"
        className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
        onClick={() => onRemove(item.id)}
      >
        <X className="size-3.5" />
      </Button>
    </div>
  );
}
