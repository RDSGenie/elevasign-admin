// ---------------------------------------------------------------------------
// Schedule-related types for the signage schema
// ---------------------------------------------------------------------------

export type ScheduleType = "recurring" | "one_time";

/** Row shape coming straight from signage.schedules */
export interface Schedule {
  id: string;
  screen_id: string;
  playlist_id: string;
  schedule_type: ScheduleType;
  priority: number;
  days_of_week: number[] | null;
  start_time: string | null;
  end_time: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  name: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Schedule joined with screen and playlist names */
export interface ScheduleWithRelations extends Schedule {
  screens: { id: string; name: string } | null;
  playlists: { id: string; name: string; is_active: boolean } | null;
}

// ---------------------------------------------------------------------------
// Mutation payloads
// ---------------------------------------------------------------------------

export interface CreateScheduleData {
  name?: string;
  screen_id: string;
  playlist_id: string;
  schedule_type: ScheduleType;
  priority?: number;
  days_of_week?: number[];
  start_time?: string;
  end_time?: string;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
}

export interface UpdateScheduleData {
  name?: string | null;
  screen_id?: string;
  playlist_id?: string;
  schedule_type?: ScheduleType;
  priority?: number;
  days_of_week?: number[] | null;
  start_time?: string | null;
  end_time?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_active?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simple screen/playlist row for dropdowns */
export interface ScreenOption {
  id: string;
  name: string;
}

export interface PlaylistOption {
  id: string;
  name: string;
  is_active: boolean;
}

/** Day-of-week constants (ISO: 1=Mon, 7=Sun) */
export const DAYS_OF_WEEK = [
  { value: 1, label: "Mon", fullLabel: "Monday" },
  { value: 2, label: "Tue", fullLabel: "Tuesday" },
  { value: 3, label: "Wed", fullLabel: "Wednesday" },
  { value: 4, label: "Thu", fullLabel: "Thursday" },
  { value: 5, label: "Fri", fullLabel: "Friday" },
  { value: 6, label: "Sat", fullLabel: "Saturday" },
  { value: 7, label: "Sun", fullLabel: "Sunday" },
] as const;

/** Palette of colors for schedule blocks in the calendar */
export const SCHEDULE_COLORS = [
  "bg-blue-500/80",
  "bg-emerald-500/80",
  "bg-violet-500/80",
  "bg-amber-500/80",
  "bg-rose-500/80",
  "bg-cyan-500/80",
  "bg-fuchsia-500/80",
  "bg-lime-500/80",
  "bg-orange-500/80",
  "bg-teal-500/80",
] as const;

/**
 * Returns a stable colour class for a given playlist ID by hashing it.
 */
export function getPlaylistColor(playlistId: string): string {
  let hash = 0;
  for (let i = 0; i < playlistId.length; i++) {
    hash = (hash << 5) - hash + playlistId.charCodeAt(i);
    hash |= 0;
  }
  return SCHEDULE_COLORS[Math.abs(hash) % SCHEDULE_COLORS.length];
}

/**
 * Format days_of_week array to short labels like "Mon, Wed, Fri"
 */
export function formatDaysOfWeek(days: number[] | null): string {
  if (!days || days.length === 0) return "-";
  if (days.length === 7) return "Every day";
  if (
    days.length === 5 &&
    [1, 2, 3, 4, 5].every((d) => days.includes(d))
  ) {
    return "Weekdays";
  }
  if (
    days.length === 2 &&
    [6, 7].every((d) => days.includes(d))
  ) {
    return "Weekends";
  }
  return days
    .sort((a, b) => a - b)
    .map((d) => DAYS_OF_WEEK.find((dw) => dw.value === d)?.label ?? "")
    .filter(Boolean)
    .join(", ");
}

/**
 * Format time range "08:00 - 17:00"
 */
export function formatTimeRange(
  startTime: string | null,
  endTime: string | null
): string {
  if (!startTime || !endTime) return "-";
  const fmt = (t: string) => t.slice(0, 5); // HH:mm
  return `${fmt(startTime)} - ${fmt(endTime)}`;
}
