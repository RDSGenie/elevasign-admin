"use client";

import { use, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { toast } from "sonner";
import {
  ChevronLeft,
  Save,
  ListMusic,
  Clock,
  Play,
  Loader2,
  MonitorPlay,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import {
  getPlaylist,
  updatePlaylist,
  addPlaylistItem,
  removePlaylistItem,
  updatePlaylistItem,
  reorderPlaylistItems,
} from "@/lib/supabase/playlist-queries";
import { PlaylistItemRow } from "@/components/playlists/playlist-item";
import { MediaBrowser } from "@/components/playlists/media-browser";
import { PlaylistPreviewDialog } from "@/components/playlists/playlist-preview-dialog";
import type {
  TransitionType,
  PlaylistItemWithMedia,
  MediaItem,
} from "@/types/playlists";

const TRANSITION_OPTIONS: { value: TransitionType; label: string }[] = [
  { value: "crossfade", label: "Crossfade" },
  { value: "slide_left", label: "Slide Left" },
  { value: "slide_right", label: "Slide Right" },
  { value: "fade", label: "Fade" },
  { value: "none", label: "None" },
];

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

export default function PlaylistEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------
  const {
    data: playlist,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["playlist", id],
    queryFn: () => {
      const supabase = createClient();
      return getPlaylist(supabase, id);
    },
  });

  // ---------------------------------------------------------------------------
  // Local state for editable fields
  // ---------------------------------------------------------------------------
  const [name, setName] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [transitionType, setTransitionType] = useState<TransitionType | null>(
    null
  );
  const [transitionDuration, setTransitionDuration] = useState<number | null>(
    null
  );
  const [isActive, setIsActive] = useState<boolean | null>(null);

  // Derive effective values: local state wins over server data
  const effectiveName = name ?? playlist?.name ?? "";
  const effectiveDescription = description ?? playlist?.description ?? "";
  const effectiveTransition =
    transitionType ?? playlist?.transition_type ?? "crossfade";
  const effectiveTransitionDuration =
    transitionDuration ?? playlist?.transition_duration_ms ?? 300;
  const effectiveIsActive = isActive ?? playlist?.is_active ?? true;

  // ---------------------------------------------------------------------------
  // Local items state for optimistic reordering
  // ---------------------------------------------------------------------------
  const [localItems, setLocalItems] = useState<PlaylistItemWithMedia[] | null>(
    null
  );
  const items = localItems ?? playlist?.playlist_items ?? [];

  // Sync server data into local items when it first arrives
  // (but don't overwrite if user has reordered)
  const serverItems = playlist?.playlist_items;
  if (serverItems && !localItems) {
    // Only set on first load -- controlled via localItems being null
  }

  const existingMediaIds = useMemo(
    () => new Set(items.map((i) => i.media_item_id)),
    [items]
  );

  const totalDuration = useMemo(
    () =>
      items
        .filter((i) => i.is_enabled)
        .reduce((sum, i) => sum + i.display_duration_seconds, 0),
    [items]
  );

  // ---------------------------------------------------------------------------
  // DnD setup
  // ---------------------------------------------------------------------------
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const currentItems = localItems ?? playlist?.playlist_items ?? [];
      const oldIndex = currentItems.findIndex((i) => i.id === active.id);
      const newIndex = currentItems.findIndex((i) => i.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(currentItems, oldIndex, newIndex).map(
        (item, idx) => ({
          ...item,
          sort_order: idx,
        })
      );

      setLocalItems(reordered);
    },
    [localItems, playlist?.playlist_items]
  );

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------
  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      await updatePlaylist(supabase, id, {
        name: effectiveName,
        description: effectiveDescription || null,
        transition_type: effectiveTransition,
        transition_duration_ms: effectiveTransitionDuration,
        is_active: effectiveIsActive,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlist", id] });
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
    },
    onError: (err: Error) => {
      toast.error(`Failed to save settings: ${err.message}`);
    },
  });

  const saveOrderMutation = useMutation({
    mutationFn: async () => {
      if (!localItems) return;
      const supabase = createClient();
      await reorderPlaylistItems(
        supabase,
        id,
        localItems.map((item, idx) => ({ id: item.id, sort_order: idx }))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlist", id] });
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
    },
    onError: (err: Error) => {
      toast.error(`Failed to save order: ${err.message}`);
    },
  });

  async function handleSaveAll() {
    try {
      await Promise.all([
        saveSettingsMutation.mutateAsync(),
        localItems ? saveOrderMutation.mutateAsync() : Promise.resolve(),
      ]);
      toast.success("Playlist saved");
      // Reset local state so it re-syncs from server
      setName(null);
      setDescription(null);
      setTransitionType(null);
      setTransitionDuration(null);
      setIsActive(null);
      setLocalItems(null);
    } catch {
      // errors are handled in individual mutation onError
    }
  }

  const addItemMutation = useMutation({
    mutationFn: async (media: MediaItem) => {
      const supabase = createClient();
      const currentItems = localItems ?? playlist?.playlist_items ?? [];
      const maxOrder =
        currentItems.length > 0
          ? Math.max(...currentItems.map((i) => i.sort_order))
          : -1;

      const isVideo = media.file_type.startsWith("video/");
      const duration = isVideo
        ? media.duration_seconds ?? 10
        : 10;

      return addPlaylistItem(supabase, {
        playlist_id: id,
        media_item_id: media.id,
        sort_order: maxOrder + 1,
        display_duration_seconds: duration,
      });
    },
    onSuccess: (newItem) => {
      // Add to local items optimistically
      const currentItems = localItems ?? playlist?.playlist_items ?? [];
      setLocalItems([...currentItems, newItem]);
      queryClient.invalidateQueries({ queryKey: ["playlist", id] });
      toast.success("Item added");
    },
    onError: (err: Error) => {
      toast.error(`Failed to add item: ${err.message}`);
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const supabase = createClient();
      await removePlaylistItem(supabase, itemId);
      return itemId;
    },
    onSuccess: (itemId) => {
      const currentItems = localItems ?? playlist?.playlist_items ?? [];
      setLocalItems(currentItems.filter((i) => i.id !== itemId));
      queryClient.invalidateQueries({ queryKey: ["playlist", id] });
      toast.success("Item removed");
    },
    onError: (err: Error) => {
      toast.error(`Failed to remove item: ${err.message}`);
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async (payload: {
      itemId: string;
      data: { display_duration_seconds?: number; is_enabled?: boolean };
    }) => {
      const supabase = createClient();
      await updatePlaylistItem(supabase, payload.itemId, payload.data);
      return payload;
    },
    onSuccess: ({ itemId, data }) => {
      const currentItems = localItems ?? playlist?.playlist_items ?? [];
      setLocalItems(
        currentItems.map((i) =>
          i.id === itemId ? { ...i, ...data } : i
        )
      );
    },
    onError: (err: Error) => {
      toast.error(`Failed to update item: ${err.message}`);
    },
  });

  function handleAddMedia(media: MediaItem) {
    addItemMutation.mutate(media);
  }

  function handleRemoveItem(itemId: string) {
    removeItemMutation.mutate(itemId);
  }

  function handleToggleEnabled(itemId: string, enabled: boolean) {
    updateItemMutation.mutate({
      itemId,
      data: { is_enabled: enabled },
    });
  }

  function handleDurationChange(itemId: string, duration: number) {
    // Update local state immediately for responsiveness
    const currentItems = localItems ?? playlist?.playlist_items ?? [];
    setLocalItems(
      currentItems.map((i) =>
        i.id === itemId ? { ...i, display_duration_seconds: duration } : i
      )
    );
    // Debounced server update -- fire and forget
    updateItemMutation.mutate({
      itemId,
      data: { display_duration_seconds: duration },
    });
  }

  const isSaving =
    saveSettingsMutation.isPending || saveOrderMutation.isPending;

  const [previewOpen, setPreviewOpen] = useState(false);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <Skeleton className="h-[600px] rounded-xl" />
          <Skeleton className="h-[600px] rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/playlists")}>
          <ChevronLeft data-icon="inline-start" />
          Back to Playlists
        </Button>
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center">
          <p className="text-sm text-destructive">
            Failed to load playlist. It may have been deleted.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/playlists")}
        >
          <ChevronLeft data-icon="inline-start" />
          Playlists
        </Button>

        <div className="flex flex-1 items-center gap-3 overflow-hidden">
          <Input
            value={effectiveName}
            onChange={(e) => setName(e.target.value)}
            className="h-8 max-w-xs text-base font-semibold"
            placeholder="Playlist name"
          />
          <Badge
            variant={effectiveIsActive ? "default" : "secondary"}
            className="shrink-0"
          >
            {effectiveIsActive ? "Active" : "Inactive"}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
            <Play className="size-3" />
            {items.length} items
          </span>
          <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
            <Clock className="size-3" />
            {formatDuration(totalDuration)}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPreviewOpen(true)}
            disabled={items.length === 0}
          >
            <MonitorPlay className="size-3.5" data-icon="inline-start" />
            Preview
          </Button>
          <Button
            size="sm"
            onClick={handleSaveAll}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="size-3.5 animate-spin" data-icon="inline-start" />
            ) : (
              <Save className="size-3.5" data-icon="inline-start" />
            )}
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[1fr_300px]">
        {/* Right panel - Playlist items (shows first on mobile) */}
        <div className="order-2 flex flex-col overflow-hidden rounded-xl border lg:order-1">
          {/* Playlist settings strip */}
          <div className="space-y-3 border-b bg-muted/30 p-4">
            <div className="space-y-1.5">
              <Label htmlFor="playlist-desc" className="text-xs">
                Description
              </Label>
              <Textarea
                id="playlist-desc"
                value={effectiveDescription}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description..."
                className="min-h-14 resize-none text-xs"
              />
            </div>

            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Transition</Label>
                <Select
                  value={effectiveTransition}
                  onValueChange={(val) =>
                    setTransitionType(val as TransitionType)
                  }
                >
                  <SelectTrigger size="sm" className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSITION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-40 space-y-1.5">
                <Label className="text-xs">
                  Duration:{" "}
                  <span className="tabular-nums">
                    {effectiveTransitionDuration}ms
                  </span>
                </Label>
                <Slider
                  min={100}
                  max={1000}
                  step={50}
                  value={[effectiveTransitionDuration]}
                  onValueChange={(val) =>
                    setTransitionDuration(val[0])
                  }
                />
              </div>

              <div className="flex items-center gap-2">
                <Label htmlFor="active-toggle" className="text-xs">
                  Active
                </Label>
                <Switch
                  id="active-toggle"
                  size="sm"
                  checked={effectiveIsActive}
                  onCheckedChange={(checked) => setIsActive(checked)}
                />
              </div>
            </div>
          </div>

          {/* Items list */}
          <div className="flex-1 overflow-y-auto p-4">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted">
                  <ListMusic className="size-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">No items yet</p>
                <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                  Add media from the browser panel on the right, or drag and
                  drop to reorder.
                </p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={items.map((i) => i.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {items.map((item) => (
                      <PlaylistItemRow
                        key={item.id}
                        item={item}
                        onRemove={handleRemoveItem}
                        onToggleEnabled={handleToggleEnabled}
                        onDurationChange={handleDurationChange}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>

        {/* Left panel - Media browser (shows second on mobile) */}
        <div className="order-1 overflow-hidden rounded-xl border lg:order-2">
          <MediaBrowser
            existingMediaIds={existingMediaIds}
            onAddMedia={handleAddMedia}
          />
        </div>
      </div>

      <PlaylistPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        playlistName={effectiveName}
        items={items}
      />
    </div>
  );
}
