"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Plus, Image, Film, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { getMediaItems } from "@/lib/supabase/queries";
import type { MediaItem } from "@/types/playlists";

type MediaFilter = "all" | "image" | "video" | "pdf";

function getMediaIcon(fileType: string) {
  if (fileType.startsWith("video/")) return Film;
  if (fileType === "application/pdf") return FileText;
  return Image;
}

interface MediaBrowserProps {
  /** IDs of media already in the playlist -- used to show a visual indicator */
  existingMediaIds: Set<string>;
  onAddMedia: (media: MediaItem) => void;
}

export function MediaBrowser({
  existingMediaIds,
  onAddMedia,
}: MediaBrowserProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<MediaFilter>("all");

  const { data: mediaItems, isLoading } = useQuery({
    queryKey: ["media-items", search, typeFilter],
    queryFn: async () => {
      const supabase = createClient();
      return getMediaItems(supabase, {
        search: search || undefined,
        type: typeFilter,
        sort: "newest",
      });
    },
  });

  return (
    <div className="flex h-full flex-col">
      {/* Header / Filters */}
      <div className="space-y-2 border-b p-3">
        <h3 className="text-sm font-semibold">Media Library</h3>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search media..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 pl-7 text-xs"
          />
        </div>
        <Select
          value={typeFilter}
          onValueChange={(val) => setTypeFilter(val as MediaFilter)}
        >
          <SelectTrigger size="sm" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="image">Images</SelectItem>
            <SelectItem value="video">Videos</SelectItem>
            <SelectItem value="pdf">PDFs</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Media Grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-video rounded-md" />
            ))}
          </div>
        ) : !mediaItems?.length ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <Image className="mb-2 size-8 opacity-40" />
            <p className="text-sm">No media found</p>
            <p className="text-xs">Upload media in the Media Library first.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {(mediaItems as MediaItem[]).map((media) => {
              const Icon = getMediaIcon(media.file_type);
              const alreadyAdded = existingMediaIds.has(media.id);

              return (
                <button
                  key={media.id}
                  type="button"
                  onClick={() => onAddMedia(media)}
                  className={cn(
                    "group relative flex flex-col overflow-hidden rounded-md border bg-card text-left transition-colors hover:border-primary/40 hover:bg-accent/30",
                    alreadyAdded && "border-primary/20 bg-primary/5"
                  )}
                >
                  {/* Thumbnail */}
                  <div className="relative flex aspect-video items-center justify-center bg-muted">
                    {media.thumbnail_path ? (
                      <img
                        src={media.thumbnail_path}
                        alt={media.name}
                        className="size-full object-cover"
                      />
                    ) : (
                      <Icon className="size-6 text-muted-foreground/50" />
                    )}
                    {/* Add overlay on hover */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/40">
                      <Plus className="size-5 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                  </div>

                  {/* Name */}
                  <div className="px-2 py-1.5">
                    <p className="truncate text-xs font-medium leading-tight">
                      {media.name}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
