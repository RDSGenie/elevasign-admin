"use client";

import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, Loader2 } from "lucide-react";
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
import { createClient } from "@/lib/supabase/client";
import { deleteMediaItem } from "@/lib/supabase/queries";
import type { MediaItem } from "@/types/media";

interface DeleteMediaDialogProps {
  item: MediaItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteMediaDialog({
  item,
  open,
  onOpenChange,
}: DeleteMediaDialogProps) {
  const queryClient = useQueryClient();

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
      onOpenChange(false);
      toast.success("File deleted successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete file", { description: error.message });
    },
  });

  const handleDelete = useCallback(() => {
    if (!item) return;
    deleteMutation.mutate({ id: item.id, filePath: item.file_path });
  }, [item, deleteMutation]);

  if (!item) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10">
            <Trash2 className="size-5 text-destructive" />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete media file?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete &ldquo;{item.name}&rdquo; and remove it
            from storage. This action cannot be undone.
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
  );
}
