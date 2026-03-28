"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Monitor,
  Maximize,
  MoveHorizontal,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/lib/supabase/client";
import {
  createAnnouncement,
  updateAnnouncement,
} from "@/lib/supabase/announcement-queries";
import { getScreens } from "@/lib/supabase/screen-queries";
import type {
  Announcement,
  DisplayType,
  CreateAnnouncementData,
} from "@/types/announcements";

const DISPLAY_TYPES: {
  value: DisplayType;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    value: "overlay",
    label: "Overlay",
    description: "Shows over current content",
    icon: Monitor,
  },
  {
    value: "fullscreen",
    label: "Fullscreen",
    description: "Replaces all content",
    icon: Maximize,
  },
  {
    value: "ticker",
    label: "Ticker",
    description: "Scrolling bar at bottom",
    icon: MoveHorizontal,
  },
];

const PRESET_COLORS = [
  { label: "Red", value: "#DC2626" },
  { label: "Amber", value: "#D97706" },
  { label: "Blue", value: "#2563EB" },
  { label: "Green", value: "#16A34A" },
  { label: "Purple", value: "#9333EA" },
];

interface CreateAnnouncementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingAnnouncement?: Announcement | null;
  isEmergency?: boolean;
}

export function CreateAnnouncementDialog({
  open,
  onOpenChange,
  editingAnnouncement,
  isEmergency = false,
}: CreateAnnouncementDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!editingAnnouncement;

  // Form state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [displayType, setDisplayType] = useState<DisplayType>("overlay");
  const [bgColor, setBgColor] = useState("#DC2626");
  const [textColorWhite, setTextColorWhite] = useState(true);
  const [allScreens, setAllScreens] = useState(true);
  const [selectedScreenIds, setSelectedScreenIds] = useState<string[]>([]);
  const [startNow, setStartNow] = useState(true);
  const [startTime, setStartTime] = useState("");
  const [noExpiry, setNoExpiry] = useState(true);
  const [expiryTime, setExpiryTime] = useState("");

  // Fetch screens for target selection
  const { data: screens = [] } = useQuery({
    queryKey: ["screens"],
    queryFn: () => {
      const supabase = createClient();
      return getScreens(supabase);
    },
    enabled: open,
  });

  // Reset form when opening
  useEffect(() => {
    if (open) {
      if (editingAnnouncement) {
        setTitle(editingAnnouncement.title);
        setBody(editingAnnouncement.body);
        setDisplayType(editingAnnouncement.display_type);
        setBgColor(editingAnnouncement.bg_color);
        setTextColorWhite(editingAnnouncement.text_color === "#FFFFFF");
        setAllScreens(!editingAnnouncement.target_screens?.length);
        setSelectedScreenIds(editingAnnouncement.target_screens ?? []);
        setStartNow(!editingAnnouncement.starts_at);
        setStartTime(
          editingAnnouncement.starts_at
            ? editingAnnouncement.starts_at.slice(0, 16)
            : ""
        );
        setNoExpiry(!editingAnnouncement.expires_at);
        setExpiryTime(
          editingAnnouncement.expires_at
            ? editingAnnouncement.expires_at.slice(0, 16)
            : ""
        );
      } else if (isEmergency) {
        setTitle("");
        setBody("");
        setDisplayType("fullscreen");
        setBgColor("#DC2626");
        setTextColorWhite(true);
        setAllScreens(true);
        setSelectedScreenIds([]);
        setStartNow(true);
        setStartTime("");
        setNoExpiry(true);
        setExpiryTime("");
      } else {
        setTitle("");
        setBody("");
        setDisplayType("overlay");
        setBgColor("#DC2626");
        setTextColorWhite(true);
        setAllScreens(true);
        setSelectedScreenIds([]);
        setStartNow(true);
        setStartTime("");
        setNoExpiry(true);
        setExpiryTime("");
      }
    }
  }, [open, editingAnnouncement, isEmergency]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      const payload: CreateAnnouncementData = {
        title: title.trim(),
        body: body.trim(),
        display_type: displayType,
        bg_color: bgColor,
        text_color: textColorWhite ? "#FFFFFF" : "#000000",
        target_screens: allScreens ? null : selectedScreenIds,
        starts_at: startNow ? new Date().toISOString() : startTime ? new Date(startTime).toISOString() : null,
        expires_at: noExpiry ? null : expiryTime ? new Date(expiryTime).toISOString() : null,
        is_active: true,
      };
      return createAnnouncement(supabase, payload);
    },
    onSuccess: () => {
      toast.success(
        isEmergency ? "Emergency announcement sent" : "Announcement created"
      );
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error(`Failed to create announcement: ${err.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingAnnouncement) return;
      const supabase = createClient();
      return updateAnnouncement(supabase, editingAnnouncement.id, {
        title: title.trim(),
        body: body.trim(),
        display_type: displayType,
        bg_color: bgColor,
        text_color: textColorWhite ? "#FFFFFF" : "#000000",
        target_screens: allScreens ? null : selectedScreenIds,
        starts_at: startNow ? new Date().toISOString() : startTime ? new Date(startTime).toISOString() : null,
        expires_at: noExpiry ? null : expiryTime ? new Date(expiryTime).toISOString() : null,
      });
    },
    onSuccess: () => {
      toast.success("Announcement updated");
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error(`Failed to update announcement: ${err.message}`);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    if (isEditing) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  function toggleScreenSelection(screenId: string) {
    setSelectedScreenIds((prev) =>
      prev.includes(screenId)
        ? prev.filter((id) => id !== screenId)
        : [...prev, screenId]
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isEmergency && (
                <AlertTriangle className="size-5 text-red-500" />
              )}
              {isEditing
                ? "Edit Announcement"
                : isEmergency
                  ? "Emergency Announcement"
                  : "Create Announcement"}
            </DialogTitle>
            <DialogDescription>
              {isEmergency
                ? "Send an urgent announcement to all screens immediately."
                : isEditing
                  ? "Update the announcement details."
                  : "Create a new announcement to display on your screens."}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-5">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="ann-title">Title</Label>
              <Input
                id="ann-title"
                placeholder={
                  isEmergency
                    ? "e.g. Emergency Evacuation"
                    : "e.g. Building Maintenance Notice"
                }
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                autoFocus
              />
            </div>

            {/* Body */}
            <div className="space-y-2">
              <Label htmlFor="ann-body">Message</Label>
              <Textarea
                id="ann-body"
                placeholder="Enter the announcement message..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="min-h-20 resize-none"
              />
            </div>

            {/* Display type */}
            {!isEmergency && (
              <div className="space-y-2">
                <Label>Display Type</Label>
                <div className="grid grid-cols-3 gap-2">
                  {DISPLAY_TYPES.map(({ value, label, description, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center text-xs transition-colors ${
                        displayType === value
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:border-primary/30 hover:bg-muted/50"
                      }`}
                      onClick={() => setDisplayType(value)}
                    >
                      <Icon className="size-5" />
                      <span className="font-medium">{label}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {description}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Colors */}
            <div className="space-y-2">
              <Label>Background Color</Label>
              <div className="flex items-center gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={`size-8 rounded-lg border-2 transition-transform ${
                      bgColor === color.value
                        ? "scale-110 border-foreground"
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setBgColor(color.value)}
                    title={color.label}
                  />
                ))}
                <Input
                  type="text"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="ml-2 h-8 w-24 font-mono text-xs"
                  placeholder="#DC2626"
                />
              </div>
            </div>

            {/* Text color toggle */}
            <div className="flex items-center gap-3">
              <Label>Text Color</Label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={`flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors ${
                    textColorWhite
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-muted"
                  }`}
                  onClick={() => setTextColorWhite(true)}
                >
                  <span className="size-3 rounded-full border bg-white" />
                  White
                </button>
                <button
                  type="button"
                  className={`flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors ${
                    !textColorWhite
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-muted"
                  }`}
                  onClick={() => setTextColorWhite(false)}
                >
                  <span className="size-3 rounded-full border bg-black" />
                  Black
                </button>
              </div>
            </div>

            {/* Target screens */}
            {!isEmergency && (
              <div className="space-y-2">
                <Label>Target Screens</Label>
                <div className="flex items-center gap-2">
                  <Switch
                    size="sm"
                    checked={allScreens}
                    onCheckedChange={(val) => setAllScreens(val)}
                  />
                  <span className="text-sm">All screens</span>
                </div>
                {!allScreens && screens.length > 0 && (
                  <div className="mt-2 max-h-32 space-y-1 overflow-y-auto rounded-lg border p-2">
                    {screens.map((screen) => (
                      <label
                        key={screen.id}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-muted"
                      >
                        <input
                          type="checkbox"
                          checked={selectedScreenIds.includes(screen.id)}
                          onChange={() => toggleScreenSelection(screen.id)}
                          className="accent-primary"
                        />
                        <Monitor className="size-3.5 text-muted-foreground" />
                        {screen.name}
                      </label>
                    ))}
                  </div>
                )}
                {!allScreens && screens.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No screens available. Add screens first.
                  </p>
                )}
              </div>
            )}

            {/* Schedule */}
            {!isEmergency && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      size="sm"
                      checked={startNow}
                      onCheckedChange={(val) => setStartNow(val)}
                    />
                    <span className="text-xs">Now</span>
                  </div>
                  {!startNow && (
                    <Input
                      type="datetime-local"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="mt-1 h-8 text-xs"
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Expiration</Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      size="sm"
                      checked={noExpiry}
                      onCheckedChange={(val) => setNoExpiry(val)}
                    />
                    <span className="text-xs">Manual</span>
                  </div>
                  {!noExpiry && (
                    <Input
                      type="datetime-local"
                      value={expiryTime}
                      onChange={(e) => setExpiryTime(e.target.value)}
                      className="mt-1 h-8 text-xs"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Preview */}
            <div className="space-y-2">
              <Label>Preview</Label>
              <div
                className="flex items-center justify-center rounded-lg p-4"
                style={{
                  backgroundColor: bgColor,
                  color: textColorWhite ? "#FFFFFF" : "#000000",
                  minHeight: displayType === "ticker" ? "48px" : "80px",
                }}
              >
                <div
                  className={`text-center ${
                    displayType === "ticker" ? "animate-marquee whitespace-nowrap" : ""
                  }`}
                >
                  <p className="text-sm font-bold">
                    {title || "Announcement Title"}
                  </p>
                  {displayType !== "ticker" && (
                    <p className="mt-1 text-xs opacity-90">
                      {body || "Announcement message will appear here."}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!title.trim() || isPending}
              className={
                isEmergency
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : undefined
              }
            >
              {isPending
                ? isEditing
                  ? "Saving..."
                  : "Sending..."
                : isEditing
                  ? "Save Changes"
                  : isEmergency
                    ? "Send Emergency"
                    : "Create Announcement"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
