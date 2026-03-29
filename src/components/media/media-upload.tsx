"use client";

import { useCallback, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload, X, FileIcon, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { createClient } from "@/lib/supabase/client";
import {
  uploadMediaFile,
  createMediaItem,
  computeFileHash,
  getImageDimensions,
  getVideoMetadata,
} from "@/lib/supabase/queries";
import {
  ACCEPTED_MIME_TYPES,
  getMediaCategory,
  formatFileSize,
} from "@/types/media";

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "processing" | "complete" | "error";
  error?: string;
}

interface MediaUploadProps {
  onUploadComplete?: () => void;
}

export function MediaUpload({ onUploadComplete }: MediaUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const updateFileState = useCallback(
    (id: string, update: Partial<UploadingFile>) => {
      setUploadingFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, ...update } : f))
      );
    },
    []
  );

  const removeFile = useCallback((id: string) => {
    setUploadingFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const uploadMutation = useMutation({
    mutationFn: async (uploadFile: UploadingFile) => {
      const supabase = createClient();
      const { file } = uploadFile;

      // Generate storage path
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
      const fileId = crypto.randomUUID();
      const storagePath = `media/${fileId}.${ext}`;

      // Upload to storage
      updateFileState(uploadFile.id, { status: "uploading" });
      await uploadMediaFile(supabase, file, storagePath, (progress) => {
        updateFileState(uploadFile.id, { progress });
      });

      // Process metadata
      updateFileState(uploadFile.id, {
        status: "processing",
        progress: 100,
      });

      let width: number | null = null;
      let height: number | null = null;
      let duration: number | null = null;
      let hash: string | null = null;

      const category = getMediaCategory(file.type);

      try {
        hash = await computeFileHash(file);
      } catch {
        // Hash computation is optional
      }

      try {
        if (category === "image") {
          const dims = await getImageDimensions(file);
          width = dims.width;
          height = dims.height;
        } else if (category === "video") {
          const meta = await getVideoMetadata(file);
          width = meta.width;
          height = meta.height;
          duration = meta.duration;
        }
      } catch {
        // Metadata extraction is optional
      }

      // Create DB record
      const newItem = await createMediaItem(supabase, {
        name: file.name,
        file_path: storagePath,
        file_type: file.type,
        file_size_bytes: file.size,
        width,
        height,
        duration_seconds: duration,
        sha256_hash: hash ?? "",
      });

      // Notify server to bump content versions for screens that use this media
      if (newItem?.id) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/media-upload-complete`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session?.access_token}`,
              },
              body: JSON.stringify({
                media_item_id: newItem.id,
                sha256_hash: hash ?? undefined,
              }),
            }
          );
        } catch {
          // Non-critical: version bump failure doesn't block the upload
        }
      }

      updateFileState(uploadFile.id, { status: "complete" });
      return uploadFile.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-items"] });
      onUploadComplete?.();
    },
    onError: (error: Error, uploadFile) => {
      updateFileState(uploadFile.id, {
        status: "error",
        error: error.message,
      });
      toast.error(`Failed to upload ${uploadFile.file.name}`, {
        description: error.message,
      });
    },
  });

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const validFiles = fileArray.filter((file) =>
        ACCEPTED_MIME_TYPES.includes(file.type)
      );

      if (validFiles.length < fileArray.length) {
        toast.warning("Some files were skipped", {
          description: "Only images (JPG, PNG, GIF, WebP, BMP), videos (MP4, WebM), and PDFs are accepted.",
        });
      }

      if (validFiles.length === 0) return;

      const newUploadFiles: UploadingFile[] = validFiles.map((file) => ({
        id: crypto.randomUUID(),
        file,
        progress: 0,
        status: "pending" as const,
      }));

      setUploadingFiles((prev) => [...prev, ...newUploadFiles]);

      // Start uploads
      for (const uploadFile of newUploadFiles) {
        uploadMutation.mutate(uploadFile);
      }
    },
    [uploadMutation]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFiles(e.target.files);
        // Reset input so the same files can be selected again
        e.target.value = "";
      }
    },
    [handleFiles]
  );

  const activeUploads = uploadingFiles.filter(
    (f) => f.status !== "complete"
  );
  const hasUploads = uploadingFiles.length > 0;

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
        className={cn(
          "relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 transition-colors",
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
        )}
      >
        <div
          className={cn(
            "mb-3 rounded-full p-3 transition-colors",
            isDragOver ? "bg-primary/10" : "bg-muted"
          )}
        >
          <Upload
            className={cn(
              "size-6",
              isDragOver ? "text-primary" : "text-muted-foreground"
            )}
          />
        </div>
        <p className="text-sm font-medium text-foreground">
          {isDragOver ? "Drop files here" : "Drag & drop files here"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          or click to browse. Supports images, videos, and PDFs.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_MIME_TYPES.join(",")}
          onChange={handleInputChange}
          className="hidden"
        />
      </div>

      {/* Upload progress list */}
      {hasUploads && (
        <div className="space-y-2">
          {uploadingFiles.map((uploadFile) => (
            <div
              key={uploadFile.id}
              className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2"
            >
              <FileIcon className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">
                    {uploadFile.file.name}
                  </p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatFileSize(uploadFile.file.size)}
                  </span>
                </div>
                {(uploadFile.status === "uploading" ||
                  uploadFile.status === "pending") && (
                  <Progress
                    value={uploadFile.progress}
                    className="mt-1.5 h-1.5"
                  />
                )}
                {uploadFile.status === "processing" && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Loader2 className="size-3 animate-spin" />
                    Processing...
                  </p>
                )}
                {uploadFile.status === "complete" && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle2 className="size-3" />
                    Complete
                  </p>
                )}
                {uploadFile.status === "error" && (
                  <p className="mt-1 text-xs text-destructive">
                    {uploadFile.error ?? "Upload failed"}
                  </p>
                )}
              </div>
              {(uploadFile.status === "complete" ||
                uploadFile.status === "error") && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(uploadFile.id);
                  }}
                >
                  <X className="size-3" />
                </Button>
              )}
            </div>
          ))}
          {activeUploads.length === 0 && uploadingFiles.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => setUploadingFiles([])}
            >
              Clear all
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
