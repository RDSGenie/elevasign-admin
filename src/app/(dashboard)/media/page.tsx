"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Image as ImageIcon,
  Video,
  FileText,
  FileStack,
  ArrowUpDown,
  Loader2,
  UploadCloud,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { getMediaItems } from "@/lib/supabase/queries";
import type { MediaItem, MediaFilters } from "@/types/media";
import { MediaUpload } from "@/components/media/media-upload";
import { MediaCard } from "@/components/media/media-card";
import { MediaPreview } from "@/components/media/media-preview";
import { DeleteMediaDialog } from "@/components/media/delete-media-dialog";

export default function MediaPage() {
  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<MediaFilters["type"]>("all");
  const [sort, setSort] = useState<MediaFilters["sort"]>("newest");

  // Preview state
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Delete state
  const [deleteItem, setDeleteItem] = useState<MediaItem | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Fetch media items
  const {
    data: mediaItems = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["media-items", { search, type: typeFilter, sort }],
    queryFn: async () => {
      const supabase = createClient();
      return getMediaItems(supabase, {
        search: search || undefined,
        type: typeFilter,
        sort,
      });
    },
  });

  const handlePreview = useCallback((item: MediaItem) => {
    setPreviewItem(item);
    setPreviewOpen(true);
  }, []);

  const handleDeleteRequest = useCallback((item: MediaItem) => {
    setDeleteItem(item);
    setDeleteOpen(true);
  }, []);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Media Library</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload and manage images, videos, and documents for your signage content.
        </p>
      </div>

      {/* Upload zone */}
      <MediaUpload />

      {/* Filters bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={typeFilter} onValueChange={(val) => setTypeFilter(val as MediaFilters["type"])}>
            <SelectTrigger size="sm">
              <FileStack className="size-3.5 text-muted-foreground" />
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="image">
                <ImageIcon className="size-3.5" />
                Images
              </SelectItem>
              <SelectItem value="video">
                <Video className="size-3.5" />
                Videos
              </SelectItem>
              <SelectItem value="pdf">
                <FileText className="size-3.5" />
                PDFs
              </SelectItem>
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={(val) => setSort(val as MediaFilters["sort"])}>
            <SelectTrigger size="sm">
              <ArrowUpDown className="size-3.5 text-muted-foreground" />
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="name_asc">Name A-Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content area */}
      {isLoading ? (
        <MediaGridSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
          <p className="text-sm text-destructive">
            Failed to load media. Please try again.
          </p>
        </div>
      ) : mediaItems.length === 0 ? (
        <EmptyState hasFilters={!!search || typeFilter !== "all"} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {mediaItems.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              onPreview={handlePreview}
              onDelete={handleDeleteRequest}
            />
          ))}
        </div>
      )}

      {/* Preview dialog */}
      <MediaPreview
        item={previewItem}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />

      {/* Delete confirmation dialog */}
      <DeleteMediaDialog
        item={deleteItem}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </div>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20">
      <div className="rounded-full bg-muted p-4">
        <UploadCloud className="size-8 text-muted-foreground/60" />
      </div>
      <h3 className="mt-4 text-base font-medium">
        {hasFilters ? "No matching files" : "No media yet"}
      </h3>
      <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
        {hasFilters
          ? "Try adjusting your search or filters to find what you're looking for."
          : "Upload images, videos, or PDFs to get started. Drag and drop files above or click to browse."}
      </p>
    </div>
  );
}

function MediaGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border">
          <Skeleton className="aspect-[4/3] w-full" />
          <div className="space-y-2 px-3 py-2.5">
            <Skeleton className="h-4 w-3/4" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-14" />
              <Skeleton className="h-4 w-10" />
            </div>
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}
