// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = import("@supabase/supabase-js").SupabaseClient<any, any, any>;

import type {
  Schedule,
  ScheduleWithRelations,
  CreateScheduleData,
  UpdateScheduleData,
  ScreenOption,
  PlaylistOption,
} from "@/types/schedules";

// ---------------------------------------------------------------------------
// Schedules
// ---------------------------------------------------------------------------

const SCHEDULE_SELECT =
  "*, screens:screens!inner(id, name), playlists:playlists!inner(id, name, is_active)";

/**
 * Fetch all schedules with screen and playlist names.
 */
export async function getSchedules(
  supabase: AnySupabaseClient
): Promise<ScheduleWithRelations[]> {
  const { data, error } = await supabase
    .from("schedules")
    .select(SCHEDULE_SELECT)
    .order("priority", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ScheduleWithRelations[];
}

/**
 * Fetch a single schedule with relations.
 */
export async function getSchedule(
  supabase: AnySupabaseClient,
  id: string
): Promise<ScheduleWithRelations> {
  const { data, error } = await supabase
    .from("schedules")
    .select(SCHEDULE_SELECT)
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as ScheduleWithRelations;
}

/**
 * Create a new schedule.
 */
export async function createSchedule(
  supabase: AnySupabaseClient,
  payload: CreateScheduleData
): Promise<Schedule> {
  const { data, error } = await supabase
    .from("schedules")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data as Schedule;
}

/**
 * Update an existing schedule.
 */
export async function updateSchedule(
  supabase: AnySupabaseClient,
  id: string,
  payload: UpdateScheduleData
): Promise<Schedule> {
  const { data, error } = await supabase
    .from("schedules")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Schedule;
}

/**
 * Delete a schedule.
 */
export async function deleteSchedule(
  supabase: AnySupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase.from("schedules").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Get all schedules for a specific screen.
 */
export async function getSchedulesForScreen(
  supabase: AnySupabaseClient,
  screenId: string
): Promise<ScheduleWithRelations[]> {
  const { data, error } = await supabase
    .from("schedules")
    .select(SCHEDULE_SELECT)
    .eq("screen_id", screenId)
    .order("priority", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ScheduleWithRelations[];
}

// ---------------------------------------------------------------------------
// Dropdown data
// ---------------------------------------------------------------------------

/**
 * Fetch all screens for the schedule form dropdown.
 */
export async function getScreenOptions(
  supabase: AnySupabaseClient
): Promise<ScreenOption[]> {
  const { data, error } = await supabase
    .from("screens")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as ScreenOption[];
}

/**
 * Fetch all playlists for the schedule form dropdown.
 */
export async function getPlaylistOptions(
  supabase: AnySupabaseClient
): Promise<PlaylistOption[]> {
  const { data, error } = await supabase
    .from("playlists")
    .select("id, name, is_active")
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as PlaylistOption[];
}
