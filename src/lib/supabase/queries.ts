import type { SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;
import type {
  MediaItem,
  CreateMediaItemData,
  UpdateMediaItemData,
  MediaFilters,
} from "@/types/media";

const MEDIA_BUCKET = "signage-media";

/**
 * Fetch all media items with optional filters.
 */
export async function getMediaItems(
  supabase: AnySupabaseClient,
  filters?: MediaFilters
): Promise<MediaItem[]> {
  let query = supabase.from("media_items").select("*");

  // Search by name
  if (filters?.search) {
    query = query.ilike("name", `%${filters.search}%`);
  }

  // Filter by type category
  if (filters?.type && filters.type !== "all") {
    switch (filters.type) {
      case "image":
        query = query.like("file_type", "image/%");
        break;
      case "video":
        query = query.like("file_type", "video/%");
        break;
      case "pdf":
        query = query.eq("file_type", "application/pdf");
        break;
    }
  }

  // Sort
  switch (filters?.sort) {
    case "oldest":
      query = query.order("created_at", { ascending: true });
      break;
    case "name_asc":
      query = query.order("name", { ascending: true });
      break;
    case "newest":
    default:
      query = query.order("created_at", { ascending: false });
      break;
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as MediaItem[];
}

/**
 * Fetch a single media item by ID.
 */
export async function getMediaItem(
  supabase: AnySupabaseClient,
  id: string
): Promise<MediaItem> {
  const { data, error } = await supabase
    .from("media_items")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as MediaItem;
}

/**
 * Insert a new media item record.
 */
export async function createMediaItem(
  supabase: AnySupabaseClient,
  data: CreateMediaItemData
): Promise<MediaItem> {
  const { data: item, error } = await supabase
    .from("media_items")
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return item as MediaItem;
}

/**
 * Update an existing media item record.
 */
export async function updateMediaItem(
  supabase: AnySupabaseClient,
  id: string,
  data: UpdateMediaItemData
): Promise<MediaItem> {
  const { data: item, error } = await supabase
    .from("media_items")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return item as MediaItem;
}

/**
 * Delete a media item record and its associated storage file.
 */
export async function deleteMediaItem(
  supabase: AnySupabaseClient,
  id: string,
  filePath: string
): Promise<void> {
  // Delete the storage file first
  const { error: storageError } = await supabase.storage
    .from(MEDIA_BUCKET)
    .remove([filePath]);

  if (storageError) {
    console.error("Failed to delete storage file:", storageError);
    // Continue with record deletion even if storage deletion fails
  }

  const { error } = await supabase
    .from("media_items")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

/**
 * Upload a file to the signage-media storage bucket.
 */
export async function uploadMediaFile(
  supabase: AnySupabaseClient,
  file: File,
  path: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  // Supabase JS v2 doesn't support upload progress natively,
  // so we use XMLHttpRequest for progress tracking if a callback is provided.
  if (onProgress) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${MEDIA_BUCKET}/${path}`;

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      xhr.setRequestHeader(
        "Authorization",
        `Bearer ${session?.access_token ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`
      );
      xhr.setRequestHeader("x-upsert", "true");
      xhr.setRequestHeader("Content-Type", file.type);

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(path);
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener("error", () => {
        reject(new Error("Upload failed"));
      });

      xhr.send(file);
    });
  }

  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, { upsert: true });

  if (error) throw error;
  return path;
}

/**
 * Get the public URL for a media file.
 */
export function getMediaPublicUrl(
  supabase: AnySupabaseClient,
  path: string
): string {
  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Compute SHA-256 hash of a file (client-side).
 */
export async function computeFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Read image dimensions from a File.
 */
export function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      reject(new Error("Failed to load image"));
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Read video metadata from a File.
 */
export function getVideoMetadata(
  file: File
): Promise<{ width: number; height: number; duration: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        duration: Math.round(video.duration),
      });
      URL.revokeObjectURL(video.src);
    };
    video.onerror = () => {
      reject(new Error("Failed to load video metadata"));
      URL.revokeObjectURL(video.src);
    };
    video.src = URL.createObjectURL(file);
  });
}
