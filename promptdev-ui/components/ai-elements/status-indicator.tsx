"use client";

import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";
import {
  CheckCircleIcon,
  CircleDotIcon,
  Loader2Icon,
  SendIcon,
  XCircleIcon,
} from "lucide-react";

export type StatusIndicatorStatus =
  | "streaming"
  | "submitted"
  | "error"
  | "complete";

export type StatusIndicatorProps = ComponentProps<"div"> & {
  status: StatusIndicatorStatus;
  hasActions?: boolean;
  showIcon?: boolean;
};

const statusConfig: Record<
  StatusIndicatorStatus,
  { label: string; icon: React.ReactNode; className: string }
> = {
  streaming: {
    label: "Streaming",
    icon: <Loader2Icon className="size-3.5 animate-spin" />,
    className: "text-blue-600 bg-blue-500/10 border-blue-200",
  },
  submitted: {
    label: "Submitted",
    icon: <SendIcon className="size-3.5" />,
    className: "text-amber-600 bg-amber-500/10 border-amber-200",
  },
  error: {
    label: "Error",
    icon: <XCircleIcon className="size-3.5" />,
    className: "text-red-600 bg-red-500/10 border-red-200",
  },
  complete: {
    label: "Complete",
    icon: <CheckCircleIcon className="size-3.5" />,
    className: "text-green-600 bg-green-500/10 border-green-200",
  },
};

export const StatusIndicator = ({
  status,
  hasActions,
  showIcon = true,
  className,
  ...props
}: StatusIndicatorProps) => {
  const config = statusConfig[status];

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
      {...props}
    >
      {showIcon && config.icon}
      <span>{config.label}</span>
      {hasActions && (
        <CircleDotIcon className="size-3 ml-0.5 text-current opacity-60" />
      )}
    </div>
  );
};

StatusIndicator.displayName = "StatusIndicator";
