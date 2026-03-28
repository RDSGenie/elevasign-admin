"use client";

import { memo, useMemo } from "react";
import { Image as ImageIcon, Video, FileText, Eye, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MediaItem } from "@/types/media";
import { getMediaCategory, formatFileSize } from "@/types/media";
import { createClient } from "@/lib/supabase/client";
import { getMediaPublicUrl } from "@/lib/supabase/queries";
import { format } from "date-fns";

interface MediaCardProps {
  item: MediaItem;
  onPreview: (item: MediaItem) => void;
  onDelete: (item: MediaItem) => void;
}

const categoryConfig = {
  image: {
    icon: ImageIcon,
    label: "Image",
    color: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    placeholder: "bg-blue-50 dark:bg-blue-950/30",
  },
  video: {
    icon: Video,
    label: "Video",
    color: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
    placeholder: "bg-purple-50 dark:bg-purple-950/30",
  },
  pdf: {
    icon: FileText,
    label: "PDF",
    color: "bg-red-500/10 text-red-700 dark:text-red-400",
    placeholder: "bg-red-50 dark:bg-red-950/30",
  },
  other: {
    icon: FileText,
    label: "File",
    color: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
    placeholder: "bg-gray-50 dark:bg-gray-950/30",
  },
} as const;

export const MediaCard = memo(function MediaCard({
  item,
  onPreview,
  onDelete,
}: MediaCardProps) {
  const category = getMediaCategory(item.file_type);
  const config = categoryConfig[category];
  const Icon = config.icon;

  const publicUrl = useMemo(() => {
    const supabase = createClient();
    return getMediaPublicUrl(supabase, item.file_path);
  }, [item.file_path]);

  return (
    <div
      className="group relative overflow-hidden rounded-xl border bg-card ring-1 ring-foreground/5 transition-all hover:ring-foreground/15 hover:shadow-md"
    >
      {/* Thumbnail area */}
      <button
        type="button"
        onClick={() => onPreview(item)}
        className="relative block w-full aspect-[4/3] overflow-hidden cursor-pointer"
      >
        {category === "image" ? (
          <img
            src={publicUrl}
            alt={item.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div
            className={cn(
              "flex h-full w-full items-center justify-center",
              config.placeholder
            )}
          >
            <Icon className="size-12 text-muted-foreground/40" />
          </div>
        )}

        {/* Video duration badge */}
        {category === "video" && item.duration_seconds != null && (
          <div className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-xs font-medium text-white">
            {formatDuration(item.duration_seconds)}
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100">
          <div className="flex gap-2">
            <span className="rounded-full bg-white/90 p-2 shadow-sm">
              <Eye className="size-4 text-foreground" />
            </span>
          </div>
        </div>
      </button>

      {/* Info section */}
      <div className="px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-tight" title={item.name}>
              {item.name}
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <Badge
                variant="secondary"
                className={cn("text-[10px] font-medium", config.color)}
              >
                {config.label}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatFileSize(item.file_size_bytes)}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {format(new Date(item.created_at), "MMM d, yyyy")}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-xs"
            className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item);
            }}
          >
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        </div>
      </div>
    </div>
  );
});

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
