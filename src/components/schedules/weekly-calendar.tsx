"use client";

import { useMemo } from "react";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import type { ScheduleWithRelations } from "@/types/schedules";
import { ScheduleBlock } from "./schedule-block";

interface WeeklyCalendarProps {
  schedules: ScheduleWithRelations[];
  /** The reference date to display the week for (defaults to today) */
  currentDate?: Date;
  onScheduleClick?: (schedule: ScheduleWithRelations) => void;
}

const START_HOUR = 6;
const END_HOUR = 23;
const HOURS = Array.from(
  { length: END_HOUR - START_HOUR },
  (_, i) => START_HOUR + i
);

function formatHour(hour: number): string {
  const h = hour % 12 || 12;
  const suffix = hour < 12 ? "AM" : "PM";
  return `${h} ${suffix}`;
}

/**
 * Determines if a recurring schedule should show on a given day of the week.
 * ISO weekday: 1=Mon, 7=Sun
 */
function scheduleVisibleOnDay(
  schedule: ScheduleWithRelations,
  dayOfWeek: number, // 1-7 ISO
  date: Date
): boolean {
  if (schedule.schedule_type === "recurring") {
    return schedule.days_of_week?.includes(dayOfWeek) ?? false;
  }
  // one_time: check if the date falls within start_date..end_date
  if (schedule.start_date && schedule.end_date) {
    const start = new Date(schedule.start_date);
    const end = new Date(schedule.end_date);
    return date >= start && date <= end;
  }
  if (schedule.start_date) {
    return isSameDay(date, new Date(schedule.start_date));
  }
  return false;
}

export function WeeklyCalendar({
  schedules,
  currentDate = new Date(),
  onScheduleClick,
}: WeeklyCalendarProps) {
  // Week starts on Monday
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Group schedules by day column
  const schedulesPerDay = useMemo(() => {
    return days.map((date) => {
      // ISO day: Mon=1 .. Sun=7
      const jsDay = date.getDay(); // 0=Sun, 1=Mon ... 6=Sat
      const isoDay = jsDay === 0 ? 7 : jsDay;

      return schedules.filter(
        (s) => s.is_active && scheduleVisibleOnDay(s, isoDay, date)
      );
    });
  }, [schedules, days]);

  const today = new Date();

  return (
    <div className="overflow-x-auto rounded-lg border">
      <div className="min-w-[700px]">
        {/* Header */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b bg-muted/30">
          <div className="border-r p-2" />
          {days.map((date, i) => {
            const isToday = isSameDay(date, today);
            return (
              <div
                key={i}
                className={cn(
                  "border-r p-2 text-center text-xs font-medium last:border-r-0",
                  isToday && "bg-primary/5"
                )}
              >
                <div className="text-muted-foreground">
                  {format(date, "EEE")}
                </div>
                <div
                  className={cn(
                    "mx-auto mt-0.5 flex size-6 items-center justify-center rounded-full text-sm font-semibold",
                    isToday && "bg-primary text-primary-foreground"
                  )}
                >
                  {format(date, "d")}
                </div>
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        <div className="relative grid grid-cols-[60px_repeat(7,1fr)]">
          {/* Time labels column */}
          <div className="border-r">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="relative h-12 border-b text-right text-[10px] text-muted-foreground last:border-b-0"
              >
                <span className="absolute -top-2 right-1.5">
                  {formatHour(hour)}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((date, dayIdx) => {
            const isToday = isSameDay(date, today);
            return (
              <div
                key={dayIdx}
                className={cn(
                  "relative border-r last:border-r-0",
                  isToday && "bg-primary/[0.02]"
                )}
              >
                {/* Hour grid lines */}
                {HOURS.map((hour) => (
                  <div key={hour} className="h-12 border-b last:border-b-0" />
                ))}
                {/* Schedule blocks overlay */}
                {schedulesPerDay[dayIdx].map((schedule) => (
                  <ScheduleBlock
                    key={schedule.id}
                    schedule={schedule}
                    startHour={START_HOUR}
                    endHour={END_HOUR}
                    onClick={onScheduleClick}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
