// ---------------------------------------------------------------------------
// Playlist-related types for the signage schema
// ---------------------------------------------------------------------------

import type { MediaItem } from "./media";
export type { MediaItem } from "./media";

export type TransitionType =
  | "crossfade"
  | "slide_left"
  | "slide_right"
  | "fade"
  | "none";

/** Row shape coming straight from signage.playlists */
export interface Playlist {
  id: string;
  name: string;
  description: string | null;
  transition_type: TransitionType;
  transition_duration_ms: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Playlist with computed aggregates used on the list page */
export interface PlaylistWithStats extends Playlist {
  item_count: number;
  total_duration_seconds: number;
}

/** Row shape from signage.playlist_items */
export interface PlaylistItem {
  id: string;
  playlist_id: string;
  media_item_id: string;
  sort_order: number;
  display_duration_seconds: number;
  zone: string;
  start_date: string | null;
  end_date: string | null;
  is_enabled: boolean;
  created_at: string;
}

/** playlist_items joined with their media_item for the editor */
export interface PlaylistItemWithMedia extends PlaylistItem {
  media_item: MediaItem;
}

/** Full playlist detail used on the editor page */
export interface PlaylistDetail extends Playlist {
  playlist_items: PlaylistItemWithMedia[];
}

// ---------------------------------------------------------------------------
// Mutation payloads
// ---------------------------------------------------------------------------

export interface CreatePlaylistPayload {
  name: string;
  description?: string;
  transition_type?: TransitionType;
  transition_duration_ms?: number;
  is_active?: boolean;
}

export interface UpdatePlaylistPayload {
  name?: string;
  description?: string | null;
  transition_type?: TransitionType;
  transition_duration_ms?: number;
  is_active?: boolean;
}

export interface AddPlaylistItemPayload {
  playlist_id: string;
  media_item_id: string;
  sort_order: number;
  display_duration_seconds?: number;
  zone?: string;
}

export interface ReorderItem {
  id: string;
  sort_order: number;
}
