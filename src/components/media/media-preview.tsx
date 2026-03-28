"use client";

import { useCallback, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Image as ImageIcon,
  Video,
  FileText,
  Trash2,
  Edit2,
  Check,
  X,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogMedia,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  updateMediaItem,
  deleteMediaItem,
  getMediaPublicUrl,
} from "@/lib/supabase/queries";
import type { MediaItem } from "@/types/media";
import { getMediaCategory, formatFileSize } from "@/types/media";
import { format } from "date-fns";

interface MediaPreviewProps {
  item: MediaItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MediaPreview({ item, open, onOpenChange }: MediaPreviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const queryClient = useQueryClient();

  const publicUrl = useMemo(() => {
    if (!item) return "";
    const supabase = createClient();
    return getMediaPublicUrl(supabase, item.file_path);
  }, [item]);

  const category = item ? getMediaCategory(item.file_type) : "other";

  const renameMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const supabase = createClient();
      return updateMediaItem(supabase, id, { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-items"] });
      setIsEditing(false);
      toast.success("File renamed successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to rename file", { description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({
      id,
      filePath,
    }: {
      id: string;
      filePath: string;
    }) => {
      const supabase = createClient();
      return deleteMediaItem(supabase, id, filePath);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-items"] });
      setShowDeleteConfirm(false);
      onOpenChange(false);
      toast.success("File deleted successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete file", { description: error.message });
    },
  });

  const startEditing = useCallback(() => {
    if (!item) return;
    setEditName(item.name);
    setIsEditing(true);
  }, [item]);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setEditName("");
  }, []);

  const saveRename = useCallback(() => {
    if (!item || !editName.trim()) return;
    renameMutation.mutate({ id: item.id, name: editName.trim() });
  }, [item, editName, renameMutation]);

  const handleDelete = useCallback(() => {
    if (!item) return;
    deleteMutation.mutate({ id: item.id, filePath: item.file_path });
  }, [item, deleteMutation]);

  if (!item) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="sr-only">Media Preview</DialogTitle>
            <DialogDescription className="sr-only">
              Preview and manage media file
            </DialogDescription>
          </DialogHeader>

          {/* Preview Area */}
          <div className="overflow-hidden rounded-lg bg-muted">
            {category === "image" && (
              <img
                src={publicUrl}
                alt={item.name}
                className="mx-auto max-h-[50vh] w-auto object-contain"
              />
            )}
            {category === "video" && (
              <video
                src={publicUrl}
                controls
                className="mx-auto max-h-[50vh] w-full"
                preload="metadata"
              >
                <track kind="captions" />
              </video>
            )}
            {category === "pdf" && (
              <div className="flex flex-col items-center justify-center py-16">
                <FileText className="size-16 text-muted-foreground/40" />
                <p className="mt-3 text-sm text-muted-foreground">
                  PDF Preview
                </p>
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 text-sm text-primary underline underline-offset-2"
                >
                  Open in new tab
                </a>
              </div>
            )}
          </div>

          {/* Metadata & Actions */}
          <div className="space-y-4">
            {/* File Name - editable */}
            <div className="flex items-center gap-2">
              {isEditing ? (
                <div className="flex flex-1 items-center gap-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveRename();
                      if (e.key === "Escape") cancelEditing();
                    }}
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={saveRename}
                    disabled={renameMutation.isPending}
                  >
                    {renameMutation.isPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Check className="size-3.5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={cancelEditing}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="flex flex-1 items-center gap-2">
                  <h3 className="truncate text-base font-medium">
                    {item.name}
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={startEditing}
                  >
                    <Edit2 className="size-3.5" />
                  </Button>
                </div>
              )}
            </div>

            <Separator />

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <MetadataRow label="Type">
                <TypeBadge category={category} mimeType={item.file_type} />
              </MetadataRow>
              <MetadataRow label="Size">
                {formatFileSize(item.file_size_bytes)}
              </MetadataRow>
              {item.width != null && item.height != null && (
                <MetadataRow label="Dimensions">
                  {item.width} x {item.height} px
                </MetadataRow>
              )}
              {item.duration_seconds != null && (
                <MetadataRow label="Duration">
                  {item.duration_seconds}s
                </MetadataRow>
              )}
              <MetadataRow label="Uploaded">
                {format(new Date(item.created_at), "MMM d, yyyy 'at' h:mm a")}
              </MetadataRow>
              {item.sha256_hash && (
                <MetadataRow label="SHA-256" className="col-span-2">
                  <code className="break-all text-xs font-mono text-muted-foreground">
                    {item.sha256_hash}
                  </code>
                </MetadataRow>
              )}
            </div>

            <Separator />

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="size-3.5" />
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10">
              <Trash2 className="size-5 text-destructive" />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete media file?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{item.name}&rdquo; and remove
              it from storage. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function MetadataRow({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-0.5", className)}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function TypeBadge({
  category,
  mimeType,
}: {
  category: string;
  mimeType: string;
}) {
  const config = {
    image: {
      icon: ImageIcon,
      color: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    },
    video: {
      icon: Video,
      color: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
    },
    pdf: {
      icon: FileText,
      color: "bg-red-500/10 text-red-700 dark:text-red-400",
    },
    other: {
      icon: FileText,
      color: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
    },
  } as const;

  const c = config[category as keyof typeof config] ?? config.other;
  const Icon = c.icon;

  return (
    <Badge variant="secondary" className={cn("text-xs font-medium", c.color)}>
      <Icon className="size-3" />
      {mimeType}
    </Badge>
  );
}
