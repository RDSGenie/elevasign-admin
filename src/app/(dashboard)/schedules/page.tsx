"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { addWeeks, subWeeks, format, startOfWeek } from "date-fns";
import {
  Calendar,
  List,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Pencil,
  CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  getSchedules,
  deleteSchedule,
  getScreenOptions,
} from "@/lib/supabase/schedule-queries";
import { CreateScheduleDialog } from "@/components/schedules/create-schedule-dialog";
import { WeeklyCalendar } from "@/components/schedules/weekly-calendar";
import {
  formatDaysOfWeek,
  formatTimeRange,
  type ScheduleWithRelations,
} from "@/types/schedules";

type ViewMode = "calendar" | "list";

export default function SchedulesPage() {
  const [view, setView] = useState<ViewMode>("calendar");
  const [weekOffset, setWeekOffset] = useState(0);
  const [filterScreenId, setFilterScreenId] = useState<string>("all");
  const [editSchedule, setEditSchedule] =
    useState<ScheduleWithRelations | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  const currentDate = useMemo(() => {
    const today = new Date();
    if (weekOffset === 0) return today;
    return weekOffset > 0
      ? addWeeks(today, weekOffset)
      : subWeeks(today, Math.abs(weekOffset));
  }, [weekOffset]);

  const weekLabel = useMemo(() => {
    const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
    return format(ws, "MMM d, yyyy");
  }, [currentDate]);

  // Queries
  const {
    data: schedules,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["schedules"],
    queryFn: () => getSchedules(createClient()),
  });

  const { data: screens } = useQuery({
    queryKey: ["screen-options"],
    queryFn: () => getScreenOptions(createClient()),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSchedule(createClient(), id),
    onSuccess: () => {
      toast.success("Schedule deleted");
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
    },
    onError: (err: Error) => {
      toast.error(`Failed to delete: ${err.message}`);
    },
  });

  // Filter
  const filteredSchedules = useMemo(() => {
    if (!schedules) return [];
    if (filterScreenId === "all") return schedules;
    return schedules.filter((s) => s.screen_id === filterScreenId);
  }, [schedules, filterScreenId]);

  function handleEdit(schedule: ScheduleWithRelations) {
    setEditSchedule(schedule);
    setEditDialogOpen(true);
  }

  function handleDelete(id: string) {
    if (!window.confirm("Are you sure you want to delete this schedule?")) {
      return;
    }
    deleteMutation.mutate(id);
  }

  function handleEditDialogChange(open: boolean) {
    setEditDialogOpen(open);
    if (!open) setEditSchedule(null);
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Schedules</h1>
          <p className="text-sm text-muted-foreground">
            Manage when playlists are displayed on your screens.
          </p>
        </div>
        <CreateScheduleDialog />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border p-0.5">
            <button
              type="button"
              onClick={() => setView("calendar")}
              className={
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors " +
                (view === "calendar"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              <Calendar className="size-3.5" />
              Calendar
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors " +
                (view === "list"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              <List className="size-3.5" />
              List
            </button>
          </div>

          {/* Week nav (calendar view only) */}
          {view === "calendar" && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setWeekOffset((o) => o - 1)}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <button
                type="button"
                onClick={() => setWeekOffset(0)}
                className="min-w-[120px] rounded-md px-2 py-1 text-center text-xs font-medium text-foreground hover:bg-muted"
              >
                {weekOffset === 0 ? "This week" : weekLabel}
              </button>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setWeekOffset((o) => o + 1)}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Filter by screen */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Screen:</span>
          <Select value={filterScreenId} onValueChange={(v) => setFilterScreenId(v ?? "all")}>
            <SelectTrigger size="sm" className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All screens</SelectItem>
              {screens?.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-[500px] rounded-xl" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center">
          <p className="text-sm text-destructive">
            Failed to load schedules. Please try again.
          </p>
        </div>
      ) : !schedules?.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
            <CalendarClock className="size-6 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold">No schedules yet</h3>
          <p className="mb-6 mt-1 max-w-xs text-sm text-muted-foreground">
            Create your first schedule to assign playlists to screens at
            specific times.
          </p>
          <CreateScheduleDialog />
        </div>
      ) : view === "calendar" ? (
        <WeeklyCalendar
          schedules={filteredSchedules}
          currentDate={currentDate}
          onScheduleClick={handleEdit}
        />
      ) : (
        /* List view */
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                  Name
                </th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                  Screen
                </th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                  Playlist
                </th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                  Type
                </th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                  Days
                </th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                  Time
                </th>
                <th className="px-3 py-2.5 text-center font-medium text-muted-foreground">
                  Priority
                </th>
                <th className="px-3 py-2.5 text-center font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredSchedules.map((schedule) => (
                <tr
                  key={schedule.id}
                  className="border-b last:border-b-0 hover:bg-muted/20"
                >
                  <td className="px-3 py-2.5 font-medium">
                    {schedule.name || "-"}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {schedule.screens?.name ?? "-"}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {schedule.playlists?.name ?? "-"}
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge
                      variant={
                        schedule.schedule_type === "recurring"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {schedule.schedule_type === "recurring"
                        ? "Recurring"
                        : "One-time"}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {schedule.schedule_type === "recurring"
                      ? formatDaysOfWeek(schedule.days_of_week)
                      : schedule.start_date
                        ? `${schedule.start_date}${schedule.end_date ? ` - ${schedule.end_date}` : ""}`
                        : "-"}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {formatTimeRange(schedule.start_time, schedule.end_time)}
                  </td>
                  <td className="px-3 py-2.5 text-center tabular-nums">
                    {schedule.priority}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <Badge
                      variant={
                        schedule.is_active ? "default" : "destructive"
                      }
                    >
                      {schedule.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleEdit(schedule)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(schedule.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit dialog */}
      <CreateScheduleDialog
        editSchedule={editSchedule}
        open={editDialogOpen}
        onOpenChange={handleEditDialogChange}
      />
    </div>
  );
}
