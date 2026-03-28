"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ListMusic } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import {
  getPlaylists,
  deletePlaylist,
  duplicatePlaylist,
} from "@/lib/supabase/playlist-queries";
import { PlaylistCard } from "@/components/playlists/playlist-card";
import { CreatePlaylistDialog } from "@/components/playlists/create-playlist-dialog";

export default function PlaylistsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data: playlists,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["playlists"],
    queryFn: () => {
      const supabase = createClient();
      return getPlaylists(supabase);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      const supabase = createClient();
      return deletePlaylist(supabase, id);
    },
    onSuccess: () => {
      toast.success("Playlist deleted");
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
    },
    onError: (err: Error) => {
      toast.error(`Failed to delete: ${err.message}`);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => {
      const supabase = createClient();
      return duplicatePlaylist(supabase, id);
    },
    onSuccess: () => {
      toast.success("Playlist duplicated");
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
    },
    onError: (err: Error) => {
      toast.error(`Failed to duplicate: ${err.message}`);
    },
  });

  function handleEdit(id: string) {
    router.push(`/playlists/${id}`);
  }

  function handleDuplicate(id: string) {
    duplicateMutation.mutate(id);
  }

  function handleDelete(id: string) {
    if (!window.confirm("Are you sure you want to delete this playlist?")) {
      return;
    }
    deleteMutation.mutate(id);
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Playlists</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage content playlists for your screens.
          </p>
        </div>
        <CreatePlaylistDialog />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center">
          <p className="text-sm text-destructive">
            Failed to load playlists. Please try again.
          </p>
        </div>
      ) : !playlists?.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
            <ListMusic className="size-6 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold">No playlists yet</h3>
          <p className="mb-6 mt-1 max-w-xs text-sm text-muted-foreground">
            Create your first playlist to start organizing media content for
            your screens.
          </p>
          <CreatePlaylistDialog />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {playlists.map((playlist) => (
            <PlaylistCard
              key={playlist.id}
              playlist={playlist}
              onEdit={handleEdit}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
