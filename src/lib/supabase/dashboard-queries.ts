// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = import("@supabase/supabase-js").SupabaseClient<any, any, any>;

// ---------------------------------------------------------------------------
// Dashboard types
// ---------------------------------------------------------------------------

export interface DashboardStats {
  screensOnline: number;
  screensOffline: number;
  activePlaylists: number;
  activeAnnouncements: number;
}

export interface DashboardScreen {
  id: string;
  name: string;
  is_online: boolean;
  status: string;
  last_heartbeat_at: string | null;
  playlist_name: string | null;
}

export interface DashboardActivity {
  id: string;
  type: "announcement" | "media";
  title: string;
  detail: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Fetch dashboard statistics: online/offline screens, active playlists,
 * active announcements.
 */
export async function getDashboardStats(
  supabase: AnySupabaseClient
): Promise<DashboardStats> {
  const [screensRes, playlistsRes, announcementsRes] = await Promise.all([
    supabase.from("screens").select("id, is_online"),
    supabase
      .from("playlists")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("announcements")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
  ]);

  if (screensRes.error) throw screensRes.error;
  if (playlistsRes.error) throw playlistsRes.error;
  if (announcementsRes.error) throw announcementsRes.error;

  const screens = screensRes.data ?? [];
  const online = screens.filter(
    (s: { is_online: boolean }) => s.is_online
  ).length;

  return {
    screensOnline: online,
    screensOffline: screens.length - online,
    activePlaylists: playlistsRes.count ?? 0,
    activeAnnouncements: announcementsRes.count ?? 0,
  };
}

/**
 * Fetch recent screens with their currently assigned playlist name.
 * We grab the most recently active screens (up to 6).
 */
export async function getRecentScreens(
  supabase: AnySupabaseClient
): Promise<DashboardScreen[]> {
  // Fetch screens ordered by most recently active first
  const { data: screens, error } = await supabase
    .from("screens")
    .select("id, name, is_online, status, last_heartbeat_at")
    .order("last_heartbeat_at", { ascending: false, nullsFirst: false })
    .limit(6);

  if (error) throw error;
  if (!screens || screens.length === 0) return [];

  // Try to get active schedule assignments for these screens to find playlist names.
  // This is a best-effort lookup; if schedules aren't set up, we return null for playlist.
  const screenIds = screens.map((s: { id: string }) => s.id);

  let playlistMap: Record<string, string> = {};
  try {
    const { data: schedules } = await supabase
      .from("schedules")
      .select("screen_id, playlist:playlists(name)")
      .in("screen_id", screenIds)
      .eq("is_active", true)
      .limit(screenIds.length);

    if (schedules) {
      for (const sched of schedules) {
        const s = sched as unknown as {
          screen_id: string;
          playlist: { name: string } | { name: string }[] | null;
        };
        const playlistObj = Array.isArray(s.playlist)
          ? s.playlist[0]
          : s.playlist;
        if (playlistObj?.name && !playlistMap[s.screen_id]) {
          playlistMap[s.screen_id] = playlistObj.name;
        }
      }
    }
  } catch {
    // Schedules table may not exist or have different shape; gracefully skip
  }

  return screens.map(
    (s: {
      id: string;
      name: string;
      is_online: boolean;
      status: string;
      last_heartbeat_at: string | null;
    }) => ({
      id: s.id,
      name: s.name,
      is_online: s.is_online,
      status: s.status,
      last_heartbeat_at: s.last_heartbeat_at,
      playlist_name: playlistMap[s.id] ?? null,
    })
  );
}

/**
 * Fetch recent activity: latest announcements and media uploads,
 * merged and sorted by most recent first.
 */
export async function getRecentActivity(
  supabase: AnySupabaseClient
): Promise<DashboardActivity[]> {
  const [announcementsRes, mediaRes] = await Promise.all([
    supabase
      .from("announcements")
      .select("id, title, display_type, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("media_items")
      .select("id, name, file_type, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  if (announcementsRes.error) throw announcementsRes.error;
  if (mediaRes.error) throw mediaRes.error;

  const announcements: DashboardActivity[] = (
    announcementsRes.data ?? []
  ).map(
    (a: {
      id: string;
      title: string;
      display_type: string;
      created_at: string;
    }) => ({
      id: a.id,
      type: "announcement" as const,
      title: "Announcement created",
      detail: `"${a.title}" (${a.display_type})`,
      created_at: a.created_at,
    })
  );

  const media: DashboardActivity[] = (mediaRes.data ?? []).map(
    (m: {
      id: string;
      name: string;
      file_type: string;
      created_at: string;
    }) => ({
      id: m.id,
      type: "media" as const,
      title: "Media uploaded",
      detail: `"${m.name}" (${m.file_type.split("/")[1] ?? m.file_type})`,
      created_at: m.created_at,
    })
  );

  // Merge and sort by date descending, return top 8
  return [...announcements, ...media]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 8);
}
