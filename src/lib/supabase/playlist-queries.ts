// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = import("@supabase/supabase-js").SupabaseClient<any, any, any>;
import type {
  Playlist,
  PlaylistWithStats,
  PlaylistDetail,
  PlaylistItemWithMedia,
  CreatePlaylistPayload,
  UpdatePlaylistPayload,
  AddPlaylistItemPayload,
  ReorderItem,
} from "@/types/playlists";

// ---------------------------------------------------------------------------
// Playlists
// ---------------------------------------------------------------------------

/**
 * Fetch all playlists with item count and total duration.
 */
export async function getPlaylists(
  supabase: AnySupabaseClient
): Promise<PlaylistWithStats[]> {
  const { data, error } = await supabase
    .from("playlists")
    .select("*, playlist_items(id, display_duration_seconds, is_enabled)")
    .order("created_at", { ascending: false });

  if (error) throw error;

  type PlaylistRow = Playlist & {
    playlist_items: { id: string; display_duration_seconds: number; is_enabled: boolean }[];
  };

  return ((data ?? []) as PlaylistRow[]).map((p) => {
    const enabledItems = p.playlist_items.filter((i) => i.is_enabled);
    // Destructure to strip the nested playlist_items from the spread
    const { playlist_items, ...rest } = p;
    return {
      ...rest,
      item_count: playlist_items.length,
      total_duration_seconds: enabledItems.reduce(
        (sum, i) => sum + i.display_duration_seconds,
        0
      ),
    } satisfies PlaylistWithStats;
  });
}

/**
 * Get a single playlist with its items joined to their media_items.
 */
export async function getPlaylist(
  supabase: AnySupabaseClient,
  id: string
): Promise<PlaylistDetail> {
  const { data, error } = await supabase
    .from("playlists")
    .select(
      "*, playlist_items(*, media_item:media_items(*))"
    )
    .eq("id", id)
    .single();

  if (error) throw error;

  type RawItem = PlaylistItemWithMedia & { media_item: PlaylistItemWithMedia["media_item"] };
  type RawPlaylist = Playlist & { playlist_items: RawItem[] };

  const raw = data as RawPlaylist;

  // Sort items by sort_order
  raw.playlist_items.sort((a, b) => a.sort_order - b.sort_order);

  return raw as PlaylistDetail;
}

/**
 * Create a new playlist.
 */
export async function createPlaylist(
  supabase: AnySupabaseClient,
  payload: CreatePlaylistPayload
): Promise<Playlist> {
  const { data, error } = await supabase
    .from("playlists")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data as Playlist;
}

/**
 * Update an existing playlist.
 */
export async function updatePlaylist(
  supabase: AnySupabaseClient,
  id: string,
  payload: UpdatePlaylistPayload
): Promise<Playlist> {
  const { data, error } = await supabase
    .from("playlists")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Playlist;
}

/**
 * Delete a playlist. Cascade deletes playlist_items via FK.
 */
export async function deletePlaylist(
  supabase: AnySupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase.from("playlists").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Duplicate an existing playlist (including its items).
 */
export async function duplicatePlaylist(
  supabase: AnySupabaseClient,
  id: string
): Promise<Playlist> {
  // 1. Fetch the original playlist + items
  const original = await getPlaylist(supabase, id);

  // 2. Create a copy of the playlist
  const newPlaylist = await createPlaylist(supabase, {
    name: `${original.name} (Copy)`,
    description: original.description ?? undefined,
    transition_type: original.transition_type,
    transition_duration_ms: original.transition_duration_ms,
    is_active: false,
  });

  // 3. Copy items
  if (original.playlist_items.length > 0) {
    const items = original.playlist_items.map((item) => ({
      playlist_id: newPlaylist.id,
      media_item_id: item.media_item_id,
      sort_order: item.sort_order,
      display_duration_seconds: item.display_duration_seconds,
      zone: item.zone,
      start_date: item.start_date,
      end_date: item.end_date,
      is_enabled: item.is_enabled,
    }));

    const { error } = await supabase.from("playlist_items").insert(items);
    if (error) throw error;
  }

  return newPlaylist;
}

// ---------------------------------------------------------------------------
// Playlist Items
// ---------------------------------------------------------------------------

/**
 * Add a media item to a playlist.
 */
export async function addPlaylistItem(
  supabase: AnySupabaseClient,
  payload: AddPlaylistItemPayload
): Promise<PlaylistItemWithMedia> {
  const { data, error } = await supabase
    .from("playlist_items")
    .insert(payload)
    .select("*, media_item:media_items(*)")
    .single();

  if (error) throw error;
  return data as PlaylistItemWithMedia;
}

/**
 * Remove an item from a playlist.
 */
export async function removePlaylistItem(
  supabase: AnySupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from("playlist_items")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

/**
 * Update a single playlist item (e.g. duration, is_enabled).
 */
export async function updatePlaylistItem(
  supabase: AnySupabaseClient,
  id: string,
  payload: { display_duration_seconds?: number; is_enabled?: boolean }
): Promise<void> {
  const { error } = await supabase
    .from("playlist_items")
    .update(payload)
    .eq("id", id);
  if (error) throw error;
}

/**
 * Batch update sort_order for playlist items.
 */
export async function reorderPlaylistItems(
  supabase: AnySupabaseClient,
  playlistId: string,
  items: ReorderItem[]
): Promise<void> {
  // Use individual updates wrapped in a loop; Supabase doesn't support
  // batch upsert with partial keys elegantly, so we fire them in parallel.
  const updates = items.map((item) =>
    supabase
      .from("playlist_items")
      .update({ sort_order: item.sort_order })
      .eq("id", item.id)
      .eq("playlist_id", playlistId)
  );

  const results = await Promise.all(updates);
  const firstError = results.find((r) => r.error);
  if (firstError?.error) throw firstError.error;
}
