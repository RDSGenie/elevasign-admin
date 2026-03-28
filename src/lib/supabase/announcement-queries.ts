// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = import("@supabase/supabase-js").SupabaseClient<any, any, any>;
import type {
  Announcement,
  CreateAnnouncementData,
  UpdateAnnouncementData,
} from "@/types/announcements";

/**
 * Fetch all announcements, newest first.
 */
export async function getAnnouncements(
  supabase: AnySupabaseClient
): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Announcement[];
}

/**
 * Create a new announcement.
 */
export async function createAnnouncement(
  supabase: AnySupabaseClient,
  payload: CreateAnnouncementData
): Promise<Announcement> {
  const { data, error } = await supabase
    .from("announcements")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data as Announcement;
}

/**
 * Update an existing announcement.
 */
export async function updateAnnouncement(
  supabase: AnySupabaseClient,
  id: string,
  payload: UpdateAnnouncementData
): Promise<Announcement> {
  const { data, error } = await supabase
    .from("announcements")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Announcement;
}

/**
 * Delete an announcement.
 */
export async function deleteAnnouncement(
  supabase: AnySupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
