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
