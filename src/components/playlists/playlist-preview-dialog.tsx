"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  X,
  Clock,
  Image as ImageIcon,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { PlaylistItemWithMedia } from "@/types/playlists";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPublicMediaUrl(filePath: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/signage-media/${filePath}`;
}

function getPublicThumbnailUrl(thumbnailPath: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/signage-thumbnails/${thumbnailPath}`;
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  return `${Math.floor(seconds / 60)}m ${Math.ceil(seconds % 60)}s`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlaylistPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playlistName: string;
  items: PlaylistItemWithMedia[];
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PlaylistPreviewDialog({
  open,
  onOpenChange,
  playlistName,
  items: allItems,
}: PlaylistPreviewDialogProps) {
  // Only enabled items participate in playback
  const items = allItems.filter((i) => i.is_enabled);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const currentItem = items[currentIndex] ?? null;
  const duration = currentItem?.display_duration_seconds ?? 10;
  const progress = Math.min((elapsed / duration) * 100, 100);

  // ---------------------------------------------------------------------------
  // Playback tick
  // ---------------------------------------------------------------------------

  const goNext = useCallback(() => {
    setCurrentIndex((i) => (i + 1) % Math.max(items.length, 1));
    setElapsed(0);
  }, [items.length]);

  useEffect(() => {
    if (!open || !isPlaying || items.length === 0) return;

    intervalRef.current = setInterval(() => {
      setElapsed((e) => {
        if (e + 0.1 >= duration) {
          goNext();
          return 0;
        }
        return e + 0.1;
      });
    }, 100);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [open, isPlaying, duration, goNext, items.length]);

  // Reset on open/close
  useEffect(() => {
    if (open) {
      setCurrentIndex(0);
      setElapsed(0);
      setIsPlaying(true);
    }
  }, [open]);

  // Reset elapsed when index changes
  useEffect(() => {
    setElapsed(0);
    // Reset and play video when item changes
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      if (isPlaying) videoRef.current.play().catch(() => {});
    }
  }, [currentIndex, isPlaying]);

  // ---------------------------------------------------------------------------
  // Controls
  // ---------------------------------------------------------------------------

  const goPrev = () => {
    setCurrentIndex((i) => (i - 1 + Math.max(items.length, 1)) % Math.max(items.length, 1));
    setElapsed(0);
  };

  const togglePlay = () => {
    setIsPlaying((p) => {
      const next = !p;
      if (videoRef.current) {
        if (next) videoRef.current.play().catch(() => {});
        else videoRef.current.pause();
      }
      return next;
    });
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (items.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Preview — {playlistName}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <ImageIcon className="size-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No enabled items to preview.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const media = currentItem?.media_item;
  const isVideo = media?.file_type?.startsWith("video/");
  const mediaUrl = media ? getPublicMediaUrl(media.file_path) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <DialogTitle className="text-sm font-medium">
            Preview — {playlistName}
          </DialogTitle>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {formatTime(duration - elapsed)} remaining
            </span>
            <span>
              {currentIndex + 1} / {items.length}
            </span>
          </div>
        </div>

        {/* Main preview area — 16:9 */}
        <div className="relative aspect-video w-full overflow-hidden bg-black">
          {mediaUrl ? (
            isVideo ? (
              <video
                ref={videoRef}
                key={mediaUrl}
                src={mediaUrl}
                className="h-full w-full object-contain"
                autoPlay={isPlaying}
                muted
                playsInline
                loop={false}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={mediaUrl}
                src={mediaUrl}
                alt={media?.name ?? ""}
                className="h-full w-full object-contain"
              />
            )
          ) : (
            <div className="flex h-full items-center justify-center text-white/30">
              No media
            </div>
          )}

          {/* Progress bar overlay */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
            <div
              className="h-full bg-white/80 transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Item type badge */}
          <div className="absolute right-3 top-3">
            <span className="flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white backdrop-blur-sm">
              {isVideo ? (
                <Video className="size-3" />
              ) : (
                <ImageIcon className="size-3" />
              )}
              {media?.name ? (
                <span className="max-w-36 truncate">{media.name}</span>
              ) : null}
            </span>
          </div>

          {/* Play/pause overlay on click */}
          <button
            onClick={togglePlay}
            className="absolute inset-0 flex cursor-pointer items-center justify-center opacity-0 hover:opacity-100"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            <div className="rounded-full bg-black/60 p-4 backdrop-blur-sm">
              {isPlaying ? (
                <Pause className="size-6 text-white" />
              ) : (
                <Play className="size-6 text-white" />
              )}
            </div>
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-2 border-t bg-muted/30 px-4 py-3">
          <Button variant="ghost" size="icon-sm" onClick={goPrev} disabled={items.length <= 1}>
            <SkipBack className="size-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={togglePlay}>
            {isPlaying ? (
              <Pause className="size-4" />
            ) : (
              <Play className="size-4" />
            )}
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={goNext} disabled={items.length <= 1}>
            <SkipForward className="size-4" />
          </Button>
        </div>

        {/* Thumbnail strip */}
        {items.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto border-t p-3">
            {items.map((item, idx) => {
              const m = item.media_item;
              const thumbUrl = m?.thumbnail_path
                ? getPublicThumbnailUrl(m.thumbnail_path)
                : m?.file_path
                ? getPublicMediaUrl(m.file_path)
                : null;
              const isVid = m?.file_type?.startsWith("video/");

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentIndex(idx);
                    setElapsed(0);
                  }}
                  className={cn(
                    "relative flex-none overflow-hidden rounded border transition-all",
                    idx === currentIndex
                      ? "border-primary ring-1 ring-primary"
                      : "border-transparent opacity-60 hover:opacity-100"
                  )}
                  style={{ width: 64, height: 36 }}
                >
                  {thumbUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbUrl}
                      alt={m?.name ?? ""}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-muted">
                      {isVid ? (
                        <Video className="size-3 text-muted-foreground" />
                      ) : (
                        <ImageIcon className="size-3 text-muted-foreground" />
                      )}
                    </div>
                  )}
                  {/* Active indicator */}
                  {idx === currentIndex && (
                    <div
                      className="absolute bottom-0 left-0 h-0.5 bg-primary"
                      style={{ width: `${progress}%` }}
                    />
                  )}
                  {/* Duration badge */}
                  <span className="absolute right-0.5 top-0.5 rounded bg-black/70 px-0.5 text-[9px] text-white">
                    {item.display_duration_seconds}s
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
