"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Monitor } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { getScreens, deleteScreen } from "@/lib/supabase/screen-queries";
import { ScreenCard } from "@/components/screens/screen-card";
import { AddScreenDialog } from "@/components/screens/add-screen-dialog";

export default function ScreensPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data: screens,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["screens"],
    queryFn: () => {
      const supabase = createClient();
      return getScreens(supabase);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      const supabase = createClient();
      return deleteScreen(supabase, id);
    },
    onSuccess: () => {
      toast.success("Screen deleted");
      queryClient.invalidateQueries({ queryKey: ["screens"] });
    },
    onError: (err: Error) => {
      toast.error(`Failed to delete: ${err.message}`);
    },
  });

  const handleEdit = useCallback(
    (id: string) => {
      router.push(`/screens/${id}`);
    },
    [router]
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (!window.confirm("Are you sure you want to delete this screen?"))
        return;
      deleteMutation.mutate(id);
    },
    [deleteMutation]
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Screens</h1>
          <p className="text-sm text-muted-foreground">
            Manage and monitor your digital signage screens.
          </p>
        </div>
        <AddScreenDialog />
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
            Failed to load screens. Please try again.
          </p>
        </div>
      ) : !screens?.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
            <Monitor className="size-6 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold">No screens yet</h3>
          <p className="mb-6 mt-1 max-w-xs text-sm text-muted-foreground">
            Add your first screen to start displaying content on your digital
            signage devices.
          </p>
          <AddScreenDialog />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {screens.map((screen) => (
            <ScreenCard
              key={screen.id}
              screen={screen}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
