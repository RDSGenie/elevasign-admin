"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  AlertTriangle,
  Megaphone,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import {
  getAnnouncements,
  updateAnnouncement,
  deleteAnnouncement,
} from "@/lib/supabase/announcement-queries";
import { AnnouncementCard } from "@/components/announcements/announcement-card";
import { CreateAnnouncementDialog } from "@/components/announcements/create-announcement-dialog";
import type { Announcement } from "@/types/announcements";

export default function AnnouncementsPage() {
  const queryClient = useQueryClient();

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] =
    useState<Announcement | null>(null);

  // Fetch announcements
  const {
    data: announcements = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["announcements"],
    queryFn: () => {
      const supabase = createClient();
      return getAnnouncements(supabase);
    },
  });

  // Toggle active mutation
  const toggleMutation = useMutation({
    mutationFn: async ({
      id,
      is_active,
    }: {
      id: string;
      is_active: boolean;
    }) => {
      const supabase = createClient();
      return updateAnnouncement(supabase, id, { is_active });
    },
    onSuccess: (_, { is_active }) => {
      toast.success(
        is_active ? "Announcement activated" : "Announcement deactivated"
      );
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (err: Error) => {
      toast.error(`Failed to update: ${err.message}`);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      const supabase = createClient();
      return deleteAnnouncement(supabase, id);
    },
    onSuccess: () => {
      toast.success("Announcement deleted");
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (err: Error) => {
      toast.error(`Failed to delete: ${err.message}`);
    },
  });

  const handleEdit = useCallback((announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setCreateOpen(true);
  }, []);

  const handleToggleActive = useCallback(
    (id: string, active: boolean) => {
      toggleMutation.mutate({ id, is_active: active });
    },
    [toggleMutation]
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (!window.confirm("Are you sure you want to delete this announcement?"))
        return;
      deleteMutation.mutate(id);
    },
    [deleteMutation]
  );

  // Separate active vs past/inactive
  const now = new Date();
  const activeAnnouncements = announcements.filter((a) => {
    if (!a.is_active) return false;
    if (a.expires_at && new Date(a.expires_at) < now) return false;
    return true;
  });
  const pastAnnouncements = announcements.filter(
    (a) => !activeAnnouncements.includes(a)
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Announcements</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage announcements for your signage screens.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="destructive"
            size="lg"
            className="gap-2 bg-red-600 font-semibold text-white shadow-lg shadow-red-500/20 hover:bg-red-700"
            onClick={() => setEmergencyOpen(true)}
          >
            <AlertTriangle className="size-4" />
            Send Emergency Announcement
          </Button>
          <Button
            onClick={() => {
              setEditingAnnouncement(null);
              setCreateOpen(true);
            }}
          >
            <Plus data-icon="inline-start" />
            Create Announcement
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center">
          <p className="text-sm text-destructive">
            Failed to load announcements. Please try again.
          </p>
        </div>
      ) : announcements.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
            <Megaphone className="size-6 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold">No announcements yet</h3>
          <p className="mb-6 mt-1 max-w-xs text-sm text-muted-foreground">
            Create your first announcement to start broadcasting messages to
            your screens.
          </p>
          <Button
            onClick={() => {
              setEditingAnnouncement(null);
              setCreateOpen(true);
            }}
          >
            <Plus data-icon="inline-start" />
            Create Announcement
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active announcements */}
          {activeAnnouncements.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <span className="size-2 rounded-full bg-green-500" />
                Active ({activeAnnouncements.length})
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {activeAnnouncements.map((announcement) => (
                  <AnnouncementCard
                    key={announcement.id}
                    announcement={announcement}
                    onEdit={handleEdit}
                    onToggleActive={handleToggleActive}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Past / Inactive announcements */}
          {pastAnnouncements.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Past & Inactive ({pastAnnouncements.length})
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pastAnnouncements.map((announcement) => (
                  <AnnouncementCard
                    key={announcement.id}
                    announcement={announcement}
                    onEdit={handleEdit}
                    onToggleActive={handleToggleActive}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Create / Edit dialog */}
      <CreateAnnouncementDialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setEditingAnnouncement(null);
        }}
        editingAnnouncement={editingAnnouncement}
      />

      {/* Emergency dialog */}
      <CreateAnnouncementDialog
        open={emergencyOpen}
        onOpenChange={setEmergencyOpen}
        isEmergency
      />
    </div>
  );
}
