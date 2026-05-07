"use client";

import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export type ProgressBarProps = ComponentProps<"div"> & {
  value: number;
};

export const ProgressBar = ({
  value,
  className,
  children,
  ...props
}: ProgressBarProps) => (
  <div
    className={cn("flex w-full flex-col gap-1.5", className)}
    data-progress={value}
    {...props}
  >
    <progress value={value} max={100} className="sr-only" />
    {children}
  </div>
);

export type ProgressBarLabelProps = ComponentProps<"div">;

export const ProgressBarLabel = ({
  className,
  children,
  ...props
}: ProgressBarLabelProps) => (
  <div
    className={cn(
      "flex items-center justify-between text-sm font-medium",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export type ProgressBarValueProps = ComponentProps<"span">;

export const ProgressBarValue = ({
  className,
  children,
  ...props
}: ProgressBarValueProps) => (
  <span
    className={cn("text-xs tabular-nums text-muted-foreground", className)}
    {...props}
  >
    {children}
  </span>
);

export type ProgressBarTrackProps = ComponentProps<"div">;

export const ProgressBarTrack = ({
  className,
  children,
  ...props
}: ProgressBarTrackProps) => (
  <div
    className={cn(
      "relative h-2 w-full overflow-hidden rounded-full bg-muted",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export type ProgressBarFillProps = ComponentProps<"div"> & {
  value?: number;
};

const WIDTH_CLASSES: Record<number, string> = {
  0: 'w-0', 5: 'w-[5%]', 10: 'w-[10%]', 15: 'w-[15%]', 20: 'w-1/5',
  25: 'w-1/4', 30: 'w-[30%]', 35: 'w-[35%]', 40: 'w-2/5', 45: 'w-[45%]',
  50: 'w-1/2', 55: 'w-[55%]', 60: 'w-3/5', 65: 'w-[65%]', 70: 'w-[70%]',
  75: 'w-3/4', 80: 'w-4/5', 85: 'w-[85%]', 90: 'w-[90%]', 95: 'w-[95%]',
  100: 'w-full',
};

function getWidthClass(value: number): string {
  const clamped = Math.min(100, Math.max(0, value));
  const nearest = Object.keys(WIDTH_CLASSES)
    .map(Number)
    .reduce((prev, curr) => (Math.abs(curr - clamped) < Math.abs(prev - clamped) ? curr : prev), 0);
  return WIDTH_CLASSES[nearest] ?? 'w-1/2';
}

export const ProgressBarFill = ({
  value = 0,
  className,
  ...props
}: Omit<ProgressBarFillProps, 'style'>) => (
  <div
    className={cn(
      "h-full rounded-full transition-[width,background-color] duration-500 ease-out",
      value === 100 ? "bg-green-500" : "bg-primary",
      getWidthClass(value),
      className
    )}
    {...props}
  />
);

ProgressBar.displayName = "ProgressBar";
ProgressBarLabel.displayName = "ProgressBarLabel";
ProgressBarValue.displayName = "ProgressBarValue";
ProgressBarTrack.displayName = "ProgressBarTrack";
ProgressBarFill.displayName = "ProgressBarFill";
