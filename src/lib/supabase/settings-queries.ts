// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = import("@supabase/supabase-js").SupabaseClient<any, any, any>;

// ---------------------------------------------------------------------------
// Profile types
// ---------------------------------------------------------------------------

export type UserRole = "owner" | "editor" | "viewer";

export interface UserProfile {
  id: string;
  full_name: string | null;
  email: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateProfileData {
  full_name?: string;
  avatar_url?: string | null;
}

// ---------------------------------------------------------------------------
// Building branding types
// ---------------------------------------------------------------------------

export interface BuildingSettings {
  id: string;
  building_name: string;
  tagline: string | null;
  logo_url: string | null;
  primary_color: string;
  updated_at: string;
}

export interface UpdateBuildingSettings {
  building_name?: string;
  tagline?: string | null;
  logo_url?: string | null;
  primary_color?: string;
}

export interface StorageByType {
  type: "image" | "video" | "document" | "other";
  label: string;
  bytes: number;
  count: number;
}

export interface SystemStats {
  totalScreens: number;
  onlineScreens: number;
  totalMedia: number;
  totalStorageBytes: number;
  storageByType: StorageByType[];
  totalPlaylists: number;
  totalAnnouncements: number;
  totalProfiles: number;
}

// ---------------------------------------------------------------------------
// Profile queries
// ---------------------------------------------------------------------------

/**
 * Get the current user's profile from signage.profiles.
 */
export async function getUserProfile(
  supabase: AnySupabaseClient,
  userId: string
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    // Profile may not exist yet (e.g. first login)
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as UserProfile;
}

/**
 * Update the current user's profile.
 */
export async function updateUserProfile(
  supabase: AnySupabaseClient,
  userId: string,
  data: UpdateProfileData
): Promise<UserProfile> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;
  return profile as UserProfile;
}

/**
 * Get all user profiles (for user management).
 */
export async function getAllProfiles(
  supabase: AnySupabaseClient
): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as UserProfile[];
}

/**
 * Update a user's role (owner-only action).
 */
export async function updateUserRole(
  supabase: AnySupabaseClient,
  userId: string,
  role: UserRole
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from("profiles")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;
  return data as UserProfile;
}

/**
 * Get the building branding settings (singleton row).
 */
export async function getBuildingSettings(
  supabase: AnySupabaseClient
): Promise<BuildingSettings | null> {
  const { data, error } = await supabase
    .from("building_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as BuildingSettings | null;
}

/**
 * Upsert building branding settings.
 */
export async function updateBuildingSettings(
  supabase: AnySupabaseClient,
  settings: UpdateBuildingSettings
): Promise<BuildingSettings> {
  // Get current row id first
  const { data: current } = await supabase
    .from("building_settings")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (current?.id) {
    const { data, error } = await supabase
      .from("building_settings")
      .update({ ...settings })
      .eq("id", current.id)
      .select()
      .single();
    if (error) throw error;
    return data as BuildingSettings;
  } else {
    // Should not happen (seed in migration), but handle gracefully
    const { data, error } = await supabase
      .from("building_settings")
      .insert({ building_name: "My Building", ...settings })
      .select()
      .single();
    if (error) throw error;
    return data as BuildingSettings;
  }
}

/**
 * Get system-wide statistics for the settings page.
 */
export async function getSystemStats(
  supabase: AnySupabaseClient
): Promise<SystemStats> {
  // Run all count queries in parallel
  const [screensRes, mediaRes, playlistsRes, announcementsRes, profilesRes] =
    await Promise.all([
      supabase.from("screens").select("id, is_online", { count: "exact", head: false }),
      supabase.from("media_items").select("id, file_type, file_size_bytes", { count: "exact", head: false }),
      supabase.from("playlists").select("id", { count: "exact", head: true }),
      supabase.from("announcements").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
    ]);

  if (screensRes.error) throw screensRes.error;
  if (mediaRes.error) throw mediaRes.error;
  if (playlistsRes.error) throw playlistsRes.error;
  if (announcementsRes.error) throw announcementsRes.error;
  if (profilesRes.error) throw profilesRes.error;

  const screens = screensRes.data ?? [];
  const media = mediaRes.data ?? [];

  const onlineScreens = screens.filter(
    (s: { is_online: boolean }) => s.is_online
  ).length;

  const totalStorageBytes = media.reduce(
    (sum: number, m: { file_size_bytes: number }) => sum + (m.file_size_bytes || 0),
    0
  );

  // Aggregate storage by category
  const typeMap: Record<string, { bytes: number; count: number }> = {
    image: { bytes: 0, count: 0 },
    video: { bytes: 0, count: 0 },
    document: { bytes: 0, count: 0 },
    other: { bytes: 0, count: 0 },
  };
  for (const m of media as { file_type: string; file_size_bytes: number }[]) {
    const cat = m.file_type.startsWith("image/")
      ? "image"
      : m.file_type.startsWith("video/")
      ? "video"
      : m.file_type === "application/pdf"
      ? "document"
      : "other";
    typeMap[cat].bytes += m.file_size_bytes || 0;
    typeMap[cat].count += 1;
  }

  const typeLabels: Record<string, string> = {
    image: "Images",
    video: "Videos",
    document: "Documents",
    other: "Other",
  };

  const storageByType: StorageByType[] = (
    Object.entries(typeMap) as [StorageByType["type"], { bytes: number; count: number }][]
  )
    .filter(([, v]) => v.count > 0)
    .map(([type, v]) => ({ type, label: typeLabels[type], ...v }))
    .sort((a, b) => b.bytes - a.bytes);

  return {
    totalScreens: screensRes.count ?? screens.length,
    onlineScreens,
    totalMedia: mediaRes.count ?? media.length,
    totalStorageBytes,
    storageByType,
    totalPlaylists: playlistsRes.count ?? 0,
    totalAnnouncements: announcementsRes.count ?? 0,
    totalProfiles: profilesRes.count ?? 0,
  };
}
