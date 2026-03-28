// ---------------------------------------------------------------------------
// Announcement-related types for the signage schema
// ---------------------------------------------------------------------------

export type DisplayType = "overlay" | "fullscreen" | "ticker";

/** Row shape coming straight from signage.announcements */
export interface Announcement {
  id: string;
  title: string;
  body: string;
  display_type: DisplayType;
  bg_color: string;
  text_color: string;
  priority: number;
  target_screens: string[] | null;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

/** Payload for creating a new announcement */
export interface CreateAnnouncementData {
  title: string;
  body: string;
  display_type?: DisplayType;
  bg_color?: string;
  text_color?: string;
  priority?: number;
  target_screens?: string[] | null;
  starts_at?: string | null;
  expires_at?: string | null;
  is_active?: boolean;
}

/** Payload for updating an existing announcement */
export interface UpdateAnnouncementData {
  title?: string;
  body?: string;
  display_type?: DisplayType;
  bg_color?: string;
  text_color?: string;
  priority?: number;
  target_screens?: string[] | null;
  starts_at?: string | null;
  expires_at?: string | null;
  is_active?: boolean;
}
