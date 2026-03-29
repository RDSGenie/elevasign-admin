// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = import("@supabase/supabase-js").SupabaseClient<any, any, any>;
import type {
  Screen,
  DeviceHeartbeat,
  CreateScreenData,
  UpdateScreenData,
} from "@/types/screens";

/**
 * Fetch all screens.
 */
export async function getScreens(
  supabase: AnySupabaseClient
): Promise<Screen[]> {
  const { data, error } = await supabase
    .from("screens")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Screen[];
}

/**
 * Fetch a single screen by ID.
 */
export async function getScreen(
  supabase: AnySupabaseClient,
  id: string
): Promise<Screen> {
  const { data, error } = await supabase
    .from("screens")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as Screen;
}

/**
 * Create a new screen with a pairing code.
 */
export async function createScreen(
  supabase: AnySupabaseClient,
  payload: CreateScreenData
): Promise<Screen> {
  const { data, error } = await supabase
    .from("screens")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data as Screen;
}

/**
 * Update an existing screen.
 */
export async function updateScreen(
  supabase: AnySupabaseClient,
  id: string,
  payload: UpdateScreenData
): Promise<Screen> {
  const { data, error } = await supabase
    .from("screens")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Screen;
}

/**
 * Delete a screen.
 */
export async function deleteScreen(
  supabase: AnySupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from("screens")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

/**
 * Generate a random 6-digit numeric pairing code.
 */
export function generatePairingCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Get recent heartbeats for a screen.
 */
export async function getDeviceHeartbeats(
  supabase: AnySupabaseClient,
  screenId: string,
  limit = 20
): Promise<DeviceHeartbeat[]> {
  const { data, error } = await supabase
    .from("device_heartbeats")
    .select("*")
    .eq("screen_id", screenId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as DeviceHeartbeat[];
}

/**
 * Send a remote command to a screen device.
 */
export async function sendDeviceCommand(
  supabase: AnySupabaseClient,
  screenId: string,
  commandType: string,
  payload?: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase.from("device_commands").insert({
    screen_id: screenId,
    command_type: commandType,
    payload: payload ?? null,
    status: "pending",
  });

  if (error) throw error;
}

/**
 * Get recent commands for a screen.
 */
export async function getDeviceCommands(
  supabase: AnySupabaseClient,
  screenId: string,
  limit = 5
): Promise<import("@/types/screens").DeviceCommand[]> {
  const { data, error } = await supabase
    .from("device_commands")
    .select("*")
    .eq("screen_id", screenId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as import("@/types/screens").DeviceCommand[];
}

// ---------------------------------------------------------------------------
// Layout zone types and queries
// ---------------------------------------------------------------------------

export interface LayoutZone {
  id: string;
  screen_id: string;
  zone_name: string;
  zone_type: "playlist" | "widget" | "html";
  playlist_id: string | null;
  widget_config: Record<string, unknown> | null;
  position_x_percent: number;
  position_y_percent: number;
  width_percent: number;
  height_percent: number;
  z_index: number;
  created_at: string;
  updated_at: string;
}

export interface ZoneDefinition {
  zone_name: string;
  label: string;
  position_x_percent: number;
  position_y_percent: number;
  width_percent: number;
  height_percent: number;
}

/** Static zone geometry for each layout template. */
export const LAYOUT_ZONE_DEFINITIONS: Record<string, ZoneDefinition[]> = {
  fullscreen: [
    { zone_name: "main", label: "Main", position_x_percent: 0, position_y_percent: 0, width_percent: 100, height_percent: 100 },
  ],
  split_horizontal: [
    { zone_name: "top", label: "Top (70%)", position_x_percent: 0, position_y_percent: 0, width_percent: 100, height_percent: 70 },
    { zone_name: "bottom", label: "Bottom (30%)", position_x_percent: 0, position_y_percent: 70, width_percent: 100, height_percent: 30 },
  ],
  split_vertical: [
    { zone_name: "left", label: "Left (70%)", position_x_percent: 0, position_y_percent: 0, width_percent: 70, height_percent: 100 },
    { zone_name: "right", label: "Right (30%)", position_x_percent: 70, position_y_percent: 0, width_percent: 30, height_percent: 100 },
  ],
  grid_2x2: [
    { zone_name: "top_left", label: "Top Left", position_x_percent: 0, position_y_percent: 0, width_percent: 50, height_percent: 50 },
    { zone_name: "top_right", label: "Top Right", position_x_percent: 50, position_y_percent: 0, width_percent: 50, height_percent: 50 },
    { zone_name: "bottom_left", label: "Bottom Left", position_x_percent: 0, position_y_percent: 50, width_percent: 50, height_percent: 50 },
    { zone_name: "bottom_right", label: "Bottom Right", position_x_percent: 50, position_y_percent: 50, width_percent: 50, height_percent: 50 },
  ],
  main_with_sidebar: [
    { zone_name: "main", label: "Main (70%)", position_x_percent: 0, position_y_percent: 0, width_percent: 70, height_percent: 100 },
    { zone_name: "sidebar", label: "Sidebar (30%)", position_x_percent: 70, position_y_percent: 0, width_percent: 30, height_percent: 100 },
  ],
  main_with_ticker: [
    { zone_name: "main", label: "Main (85%)", position_x_percent: 0, position_y_percent: 0, width_percent: 100, height_percent: 85 },
    { zone_name: "ticker", label: "Ticker (15%)", position_x_percent: 0, position_y_percent: 85, width_percent: 100, height_percent: 15 },
  ],
};

/**
 * Get layout zones for a screen.
 */
export async function getLayoutZones(
  supabase: AnySupabaseClient,
  screenId: string
): Promise<LayoutZone[]> {
  const { data, error } = await supabase
    .from("layout_zones")
    .select("*")
    .eq("screen_id", screenId)
    .order("zone_name");

  if (error) throw error;
  return (data ?? []) as LayoutZone[];
}

/**
 * Save zone playlist assignments for a screen.
 * Deletes existing zones and re-inserts with new assignments.
 */
export async function saveLayoutZones(
  supabase: AnySupabaseClient,
  screenId: string,
  layout: string,
  assignments: Record<string, string | null>
): Promise<void> {
  const { error: delError } = await supabase
    .from("layout_zones")
    .delete()
    .eq("screen_id", screenId);
  if (delError) throw delError;

  const defs = LAYOUT_ZONE_DEFINITIONS[layout] ?? [];
  if (defs.length === 0) return;

  const rows = defs.map((def) => ({
    screen_id: screenId,
    zone_name: def.zone_name,
    zone_type: "playlist" as const,
    playlist_id: assignments[def.zone_name] ?? null,
    position_x_percent: def.position_x_percent,
    position_y_percent: def.position_y_percent,
    width_percent: def.width_percent,
    height_percent: def.height_percent,
    z_index: 0,
  }));

  const { error } = await supabase.from("layout_zones").insert(rows);
  if (error) throw error;
}
