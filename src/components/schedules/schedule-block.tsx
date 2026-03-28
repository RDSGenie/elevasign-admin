"use client";

import { cn } from "@/lib/utils";
import { getPlaylistColor } from "@/types/schedules";
import type { ScheduleWithRelations } from "@/types/schedules";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

interface ScheduleBlockProps {
  schedule: ScheduleWithRelations;
  startHour: number;
  endHour: number;
  onClick?: (schedule: ScheduleWithRelations) => void;
}

/**
 * Parses a "HH:MM" or "HH:MM:SS" string to fractional hours.
 */
function timeToHours(time: string): number {
  const parts = time.split(":");
  return parseInt(parts[0], 10) + parseInt(parts[1], 10) / 60;
}

export function ScheduleBlock({
  schedule,
  startHour,
  endHour,
  onClick,
}: ScheduleBlockProps) {
  const sTime = schedule.start_time ? timeToHours(schedule.start_time) : startHour;
  const eTime = schedule.end_time ? timeToHours(schedule.end_time) : endHour;

  const totalHours = endHour - startHour;
  const topPercent = ((sTime - startHour) / totalHours) * 100;
  const heightPercent = ((eTime - sTime) / totalHours) * 100;

  const colorClass = getPlaylistColor(schedule.playlist_id);
  const displayName =
    schedule.name || schedule.playlists?.name || "Untitled";
  const playlistName = schedule.playlists?.name ?? "Unknown playlist";
  const startStr = schedule.start_time?.slice(0, 5) ?? "";
  const endStr = schedule.end_time?.slice(0, 5) ?? "";

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            className={cn(
              "absolute inset-x-0.5 z-10 cursor-pointer overflow-hidden rounded-md px-1.5 py-0.5 text-left text-[11px] font-medium leading-tight text-white shadow-sm transition-opacity hover:opacity-90",
              colorClass
            )}
            style={{
              top: `${topPercent}%`,
              height: `${Math.max(heightPercent, 2)}%`,
            }}
            onClick={() => onClick?.(schedule)}
          />
        }
      >
        <span className="line-clamp-2">{displayName}</span>
        {heightPercent > 8 && (
          <span className="block text-[10px] opacity-80">
            {startStr} - {endStr}
          </span>
        )}
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        <div className="space-y-0.5">
          <p className="font-semibold">{displayName}</p>
          <p className="text-xs opacity-80">Playlist: {playlistName}</p>
          {startStr && endStr && (
            <p className="text-xs opacity-80">
              {startStr} - {endStr}
            </p>
          )}
          <p className="text-xs opacity-80">
            Priority: {schedule.priority}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
