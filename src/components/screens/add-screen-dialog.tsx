"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Monitor, Copy, Check } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { createScreen, generatePairingCode } from "@/lib/supabase/screen-queries";

export function AddScreenDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pairingCode, setPairingCode] = useState("");
  const [step, setStep] = useState<"name" | "code">("name");
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  // Generate pairing code when dialog opens
  useEffect(() => {
    if (open) {
      setPairingCode(generatePairingCode());
      setName("");
      setStep("name");
      setCopied(false);
    }
  }, [open]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      return createScreen(supabase, {
        name: name.trim(),
        pairing_code: pairingCode,
      });
    },
    onSuccess: () => {
      setStep("code");
      queryClient.invalidateQueries({ queryKey: ["screens"] });
    },
    onError: (err: Error) => {
      toast.error(`Failed to create screen: ${err.message}`);
    },
  });

  function handleSubmitName(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate();
  }

  function handleDone() {
    toast.success("Screen added successfully");
    setOpen(false);
  }

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(pairingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy code");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Monitor data-icon="inline-start" className="size-4" />
        Add Screen
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {step === "name" ? (
          <form onSubmit={handleSubmitName}>
            <DialogHeader>
              <DialogTitle>Add Screen</DialogTitle>
              <DialogDescription>
                Name your screen and generate a pairing code.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="screen-name">Screen Name</Label>
                <Input
                  id="screen-name"
                  placeholder="e.g. Lobby Display, Elevator 3"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!name.trim() || createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Generate Code"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Pairing Code</DialogTitle>
              <DialogDescription>
                Enter this code on the screen device to pair it. The code is
                valid for 10 minutes.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 flex flex-col items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 px-8 py-6">
                  <span className="font-mono text-4xl font-bold tracking-[0.3em] text-primary">
                    {pairingCode}
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={handleCopyCode}
              >
                {copied ? (
                  <>
                    <Check className="size-3.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" />
                    Copy Code
                  </>
                )}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Screen: <span className="font-medium">{name}</span>
              </p>
            </div>

            <DialogFooter className="mt-6">
              <Button onClick={handleDone}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
