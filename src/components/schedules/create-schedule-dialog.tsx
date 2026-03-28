"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import {
  getScreenOptions,
  getPlaylistOptions,
  getSchedules,
  createSchedule,
  updateSchedule,
} from "@/lib/supabase/schedule-queries";
import {
  DAYS_OF_WEEK,
  type ScheduleType,
  type ScheduleWithRelations,
  type CreateScheduleData,
  type UpdateScheduleData,
} from "@/types/schedules";

interface CreateScheduleDialogProps {
  /** If provided, the dialog is in edit mode */
  editSchedule?: ScheduleWithRelations | null;
  /** Controls dialog open state externally */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CreateScheduleDialog({
  editSchedule,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: CreateScheduleDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled
    ? (v: boolean) => controlledOnOpenChange?.(v)
    : setInternalOpen;

  const isEditing = !!editSchedule;

  // Form state
  const [name, setName] = useState("");
  const [screenId, setScreenId] = useState("");
  const [playlistId, setPlaylistId] = useState("");
  const [scheduleType, setScheduleType] = useState<ScheduleType>("recurring");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("17:00");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [priority, setPriority] = useState(0);
  const [isActive, setIsActive] = useState(true);

  const queryClient = useQueryClient();

  // Fetch screens & playlists
  const { data: screens } = useQuery({
    queryKey: ["screen-options"],
    queryFn: () => getScreenOptions(createClient()),
    enabled: open,
  });

  const { data: playlists } = useQuery({
    queryKey: ["playlist-options"],
    queryFn: () => getPlaylistOptions(createClient()),
    enabled: open,
  });

  // Fetch all schedules for conflict detection
  const { data: allSchedules } = useQuery({
    queryKey: ["schedules"],
    queryFn: () => getSchedules(createClient()),
    enabled: open,
  });

  // Populate form when editing
  useEffect(() => {
    if (editSchedule && open) {
      setName(editSchedule.name ?? "");
      setScreenId(editSchedule.screen_id);
      setPlaylistId(editSchedule.playlist_id);
      setScheduleType(editSchedule.schedule_type);
      setDaysOfWeek(editSchedule.days_of_week ?? [1, 2, 3, 4, 5]);
      setStartTime(editSchedule.start_time?.slice(0, 5) ?? "08:00");
      setEndTime(editSchedule.end_time?.slice(0, 5) ?? "17:00");
      setStartDate(editSchedule.start_date ?? "");
      setEndDate(editSchedule.end_date ?? "");
      setPriority(editSchedule.priority);
      setIsActive(editSchedule.is_active);
    }
  }, [editSchedule, open]);

  const resetForm = useCallback(() => {
    setName("");
    setScreenId("");
    setPlaylistId("");
    setScheduleType("recurring");
    setDaysOfWeek([1, 2, 3, 4, 5]);
    setStartTime("08:00");
    setEndTime("17:00");
    setStartDate("");
    setEndDate("");
    setPriority(0);
    setIsActive(true);
  }, []);

  function resetAndClose() {
    if (!isEditing) resetForm();
    setOpen(false);
  }

  // Conflict detection
  const conflicts = useMemo(() => {
    if (!allSchedules || !screenId || !startTime || !endTime) return [];

    return allSchedules.filter((s) => {
      // Don't compare with self when editing
      if (editSchedule && s.id === editSchedule.id) return false;
      // Must be same screen
      if (s.screen_id !== screenId) return false;
      if (!s.is_active) return false;
      // Check time overlap
      if (!s.start_time || !s.end_time) return false;

      const sStart = s.start_time.slice(0, 5);
      const sEnd = s.end_time.slice(0, 5);
      const hasTimeOverlap = startTime < sEnd && endTime > sStart;
      if (!hasTimeOverlap) return false;

      // Check day overlap for recurring
      if (scheduleType === "recurring" && s.schedule_type === "recurring") {
        const sDays = s.days_of_week ?? [];
        return daysOfWeek.some((d) => sDays.includes(d));
      }

      return true;
    });
  }, [
    allSchedules,
    screenId,
    startTime,
    endTime,
    daysOfWeek,
    scheduleType,
    editSchedule,
  ]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      const payload: CreateScheduleData = {
        name: name.trim() || undefined,
        screen_id: screenId,
        playlist_id: playlistId,
        schedule_type: scheduleType,
        priority,
        is_active: isActive,
        start_time: startTime || undefined,
        end_time: endTime || undefined,
      };

      if (scheduleType === "recurring") {
        payload.days_of_week = daysOfWeek;
      } else {
        payload.start_date = startDate || undefined;
        payload.end_date = endDate || undefined;
      }

      return createSchedule(supabase, payload);
    },
    onSuccess: () => {
      toast.success("Schedule created");
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      resetForm();
      setOpen(false);
    },
    onError: (err: Error) => {
      toast.error(`Failed to create schedule: ${err.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editSchedule) return;
      const supabase = createClient();
      const payload: UpdateScheduleData = {
        name: name.trim() || null,
        screen_id: screenId,
        playlist_id: playlistId,
        schedule_type: scheduleType,
        priority,
        is_active: isActive,
        start_time: startTime || null,
        end_time: endTime || null,
      };

      if (scheduleType === "recurring") {
        payload.days_of_week = daysOfWeek;
        payload.start_date = null;
        payload.end_date = null;
      } else {
        payload.days_of_week = null;
        payload.start_date = startDate || null;
        payload.end_date = endDate || null;
      }

      return updateSchedule(supabase, editSchedule.id, payload);
    },
    onSuccess: () => {
      toast.success("Schedule updated");
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      setOpen(false);
    },
    onError: (err: Error) => {
      toast.error(`Failed to update schedule: ${err.message}`);
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const canSubmit = screenId && playlistId && startTime && endTime;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    if (isEditing) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  }

  function toggleDay(day: number) {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  const dialogContent = (
    <DialogContent className="sm:max-w-lg">
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Schedule" : "Create Schedule"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the schedule configuration."
              : "Create a new schedule to assign a playlist to a screen."}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="schedule-name">
              Name{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Input
              id="schedule-name"
              placeholder="e.g. Morning Loop"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Screen */}
          <div className="space-y-2">
            <Label>Screen</Label>
            <Select value={screenId} onValueChange={(v) => setScreenId(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a screen" />
              </SelectTrigger>
              <SelectContent>
                {screens?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Playlist */}
          <div className="space-y-2">
            <Label>Playlist</Label>
            <Select value={playlistId} onValueChange={(v) => setPlaylistId(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a playlist" />
              </SelectTrigger>
              <SelectContent>
                {playlists?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                    {!p.is_active && " (inactive)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Schedule type */}
          <div className="space-y-2">
            <Label>Schedule Type</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={scheduleType === "recurring" ? "default" : "outline"}
                onClick={() => setScheduleType("recurring")}
              >
                Recurring
              </Button>
              <Button
                type="button"
                size="sm"
                variant={scheduleType === "one_time" ? "default" : "outline"}
                onClick={() => setScheduleType("one_time")}
              >
                One-time
              </Button>
            </div>
          </div>

          {/* Recurring: days of week */}
          {scheduleType === "recurring" && (
            <div className="space-y-2">
              <Label>Days of Week</Label>
              <div className="flex flex-wrap gap-1.5">
                {DAYS_OF_WEEK.map((day) => {
                  const active = daysOfWeek.includes(day.value);
                  return (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleDay(day.value)}
                      className={
                        "flex size-9 items-center justify-center rounded-lg border text-xs font-medium transition-colors " +
                        (active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input bg-background hover:bg-muted")
                      }
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* One-time: date range */}
          {scheduleType === "one_time" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Time range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="start-time">Start Time</Label>
              <Input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">End Time</Label>
              <Input
                id="end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">
              Priority{" "}
              <span className="font-normal text-muted-foreground">
                (higher overrides lower)
              </span>
            </Label>
            <Input
              id="priority"
              type="number"
              min={0}
              value={priority}
              onChange={(e) => setPriority(parseInt(e.target.value, 10) || 0)}
              className="w-24"
            />
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <Label>Active</Label>
          </div>

          {/* Conflict warning */}
          {conflicts.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-300/50 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-medium">Schedule conflict detected</p>
                <p className="mt-0.5 text-xs opacity-80">
                  {conflicts.length} existing schedule(s) overlap on the same
                  screen and time. The higher-priority schedule will take
                  precedence.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={resetAndClose}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={!canSubmit || isPending}>
            {isPending
              ? isEditing
                ? "Saving..."
                : "Creating..."
              : isEditing
                ? "Save Changes"
                : "Create"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );

  // When controlled (edit mode), render without trigger
  if (isControlled) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        {dialogContent}
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus data-icon="inline-start" />
        Create Schedule
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
}
