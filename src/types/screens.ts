// ---------------------------------------------------------------------------
// Screen-related types for the signage schema
// ---------------------------------------------------------------------------

export type ScreenStatus = "pending" | "active" | "inactive" | "maintenance";
export type ScreenOrientation = "landscape" | "portrait";
export type LayoutTemplate =
  | "fullscreen"
  | "split_horizontal"
  | "split_vertical"
  | "grid_2x2"
  | "main_with_sidebar"
  | "main_with_ticker";

/** Row shape coming straight from signage.screens */
export interface Screen {
  id: string;
  name: string;
  location: string | null;
  pairing_code: string | null;
  device_id: string | null;
  fcm_token: string | null;
  app_version: string | null;
  os_version: string | null;
  screen_resolution: string | null;
  orientation: ScreenOrientation;
  layout_template: LayoutTemplate;
  content_manifest_hash: string | null;
  last_sync_at: string | null;
  last_heartbeat_at: string | null;
  is_online: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

/** Device heartbeat record */
export interface DeviceHeartbeat {
  id: string;
  screen_id: string;
  wifi_signal: number | null;
  storage_free_mb: number | null;
  cpu_usage: number | null;
  memory_usage: number | null;
  created_at: string;
}

/** Command to send to a device */
export interface DeviceCommand {
  id: string;
  screen_id: string;
  command_type: string;
  payload: Record<string, unknown> | null;
  status: string;
  created_at: string;
  executed_at: string | null;
}

/** Payload for creating a new screen */
export interface CreateScreenData {
  name: string;
  pairing_code: string;
  orientation?: ScreenOrientation;
  layout_template?: LayoutTemplate;
}

/** Payload for updating an existing screen */
export interface UpdateScreenData {
  name?: string;
  location?: string | null;
  orientation?: ScreenOrientation;
  layout_template?: LayoutTemplate;
  status?: string;
}
