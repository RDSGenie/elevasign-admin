"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { createPlaylist } from "@/lib/supabase/playlist-queries";
import type { TransitionType } from "@/types/playlists";

const TRANSITION_OPTIONS: { value: TransitionType; label: string }[] = [
  { value: "crossfade", label: "Crossfade" },
  { value: "slide_left", label: "Slide Left" },
  { value: "slide_right", label: "Slide Right" },
  { value: "fade", label: "Fade" },
  { value: "none", label: "None" },
];

export function CreatePlaylistDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [transitionType, setTransitionType] =
    useState<TransitionType>("crossfade");

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      return createPlaylist(supabase, {
        name: name.trim(),
        description: description.trim() || undefined,
        transition_type: transitionType,
      });
    },
    onSuccess: () => {
      toast.success("Playlist created");
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      resetAndClose();
    },
    onError: (err: Error) => {
      toast.error(`Failed to create playlist: ${err.message}`);
    },
  });

  function resetAndClose() {
    setName("");
    setDescription("");
    setTransitionType("crossfade");
    setOpen(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    mutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button />}
      >
        <Plus data-icon="inline-start" />
        Create Playlist
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Playlist</DialogTitle>
            <DialogDescription>
              Create a new content playlist for your screens.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="playlist-name">Name</Label>
              <Input
                id="playlist-name"
                placeholder="e.g. Morning Announcements"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="playlist-description">
                Description{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Textarea
                id="playlist-description"
                placeholder="A brief description of this playlist..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-20 resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label>Transition</Label>
              <Select
                value={transitionType}
                onValueChange={(val) =>
                  setTransitionType(val as TransitionType)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRANSITION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={resetAndClose}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || mutation.isPending}
            >
              {mutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
