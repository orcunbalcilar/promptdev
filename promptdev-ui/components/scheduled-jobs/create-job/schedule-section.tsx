"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarClock, Clock, Power } from "lucide-react";
import { CRON_PRESETS, describeCron } from "../constants";
import { useJobForm } from "./_form-context";

export function ScheduleSection() {
  const {
    cronExpression,
    setCronExpression,
    selectedPreset,
    setSelectedPreset,
    startAt,
    setStartAt,
    enabled,
    setEnabled,
  } = useJobForm();

  return (
    <div className="grid gap-4">
      {/* Cron Expression */}
      <div className="grid gap-2">
        <Label>Schedule (Cron Expression)</Label>
        <Select
          value={selectedPreset}
          onValueChange={
            /* v8 ignore start -- cron preset handler */ (v) => {
              setSelectedPreset(v);
              if (v !== "custom") {
                setCronExpression(v);
              }
              /* v8 ignore stop */
            }
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CRON_PRESETS.map((preset) => (
              <SelectItem key={preset.value} value={preset.value}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedPreset === "custom" && (
          <Input
            value={cronExpression}
            onChange={(e) => setCronExpression(e.target.value)}
            placeholder="0 0 2 * * MON"
            className="font-mono text-xs"
          />
        )}
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {describeCron(cronExpression)}
        </p>
      </div>

      {/* Start Date */}
      <div className="grid gap-2">
        <Label htmlFor="startAt">
          <span className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            Start Date (optional)
          </span>
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !startAt && "text-muted-foreground",
              )}
            >
              <CalendarClock className="mr-2 h-4 w-4" />
              {startAt ? (
                format(new Date(startAt), "PPP p")
              ) : (
                <span>Pick a date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={startAt ? new Date(startAt) : undefined}
              onSelect={(date) => {
                /* v8 ignore start — calendar date deselect/select */
                if (!date) {
                  setStartAt("");
                  return;
                }
                const current = startAt ? new Date(startAt) : new Date();
                current.setFullYear(
                  date.getFullYear(),
                  date.getMonth(),
                  date.getDate(),
                );
                if (!startAt) {
                  const now = new Date();
                  current.setHours(now.getHours());
                  current.setMinutes(now.getMinutes());
                }
                /* v8 ignore stop */
                setStartAt(format(current, "yyyy-MM-dd'T'HH:mm"));
              }}
              initialFocus
            />
            <div className="p-3 border-t">
              <Label htmlFor="time-input" className="text-xs">
                Time
              </Label>
              <Input
                id="time-input"
                type="time"
                className="mt-2"
                value={startAt ? format(new Date(startAt), "HH:mm") : ""}
                onChange={
                  /* v8 ignore start -- time input handler */ (e) => {
                    const time = e.target.value;
                    if (!time) return;
                    const [hours, minutes] = time.split(":").map(Number);
                    const date = startAt ? new Date(startAt) : new Date();
                    date.setHours(hours);
                    date.setMinutes(minutes);
                    setStartAt(format(date, "yyyy-MM-dd'T'HH:mm"));
                    /* v8 ignore stop */
                  }
                }
              />
            </div>
          </PopoverContent>
        </Popover>
        <p className="text-xs text-muted-foreground">
          If set, the job won&apos;t execute until this date. Leave empty to
          start immediately.
        </p>
      </div>

      {/* Enabled Toggle */}
      <div className="flex items-center gap-3 rounded-lg border p-3">
        <input
          type="checkbox"
          id="jobEnabled"
          title="Enable job immediately"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300"
        />
        <div className="flex-1">
          <Label htmlFor="jobEnabled" className="cursor-pointer">
            <span className="flex items-center gap-2">
              <Power className="h-4 w-4" />
              Enable Job
            </span>
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            {enabled
              ? "Job will start running on schedule immediately after creation."
              : "Job will be created in disabled state. You can enable it later."}
          </p>
        </div>
      </div>
    </div>
  );
}
