export interface MediaItem {
  id: string;
  name: string;
  file_path: string;
  file_type: string;
  file_size_bytes: number;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  sha256_hash: string | null;
  thumbnail_path: string | null;
  uploaded_by: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface CreateMediaItemData {
  name: string;
  file_path: string;
  file_type: string;
  file_size_bytes: number;
  width?: number | null;
  height?: number | null;
  duration_seconds?: number | null;
  sha256_hash?: string | null;
  thumbnail_path?: string | null;
  uploaded_by?: string | null;
  tags?: string[];
}

export interface UpdateMediaItemData {
  name?: string;
  tags?: string[];
}

export interface MediaFilters {
  search?: string;
  type?: "all" | "image" | "video" | "pdf";
  sort?: "newest" | "oldest" | "name_asc";
}

export type MediaCategory = "image" | "video" | "pdf" | "other";

export function getMediaCategory(fileType: string): MediaCategory {
  if (fileType.startsWith("image/")) return "image";
  if (fileType.startsWith("video/")) return "video";
  if (fileType === "application/pdf") return "pdf";
  return "other";
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}

export const ACCEPTED_FILE_TYPES = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/gif": [".gif"],
  "image/webp": [".webp"],
  "image/bmp": [".bmp"],
  "video/mp4": [".mp4"],
  "video/webm": [".webm"],
  "application/pdf": [".pdf"],
} as const;

export const ACCEPTED_EXTENSIONS = Object.values(ACCEPTED_FILE_TYPES).flat();
export const ACCEPTED_MIME_TYPES = Object.keys(ACCEPTED_FILE_TYPES);
