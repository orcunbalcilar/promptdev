import { CheckCircle2, CircleDot, XCircle } from "lucide-react";

export const PIE_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "#8884d8",
  "#82ca9d",
  "#ffc658",
];

export const STATUS_CONFIG: Record<
  string,
  { color: string; icon: typeof CheckCircle2 }
> = {
  ACTIVE: {
    color: "bg-green-500/10 text-green-700 border-green-200",
    icon: CircleDot,
  },
  ENDED: {
    color: "bg-gray-500/10 text-gray-700 border-gray-200",
    icon: CheckCircle2,
  },
  ERROR: {
    color: "bg-red-500/10 text-red-700 border-red-200",
    icon: XCircle,
  },
};

export const OP_TYPE_CONFIG: Record<string, string> = {
  SESSION_CREATED: "bg-green-500/10 text-green-700 border-green-200",
  SESSION_DESTROYED: "bg-gray-500/10 text-gray-700 border-gray-200",
  MESSAGE_SENT: "bg-blue-500/10 text-blue-700 border-blue-200",
  MESSAGE_RECEIVED: "bg-indigo-500/10 text-indigo-700 border-indigo-200",
  TOOL_EXECUTION_START: "bg-amber-500/10 text-amber-700 border-amber-200",
  TOOL_EXECUTION_END: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  TOOL_EXECUTION_ERROR: "bg-red-500/10 text-red-700 border-red-200",
  ERROR: "bg-red-500/10 text-red-700 border-red-200",
  WARNING: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
};

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function formatDuration(startDate: string, endDate?: string): string {
  const start = new Date(startDate).getTime();
  const end = endDate ? new Date(endDate).getTime() : Date.now();
  const durationMs = end - start;
  const mins = Math.floor(durationMs / 60000);
  const secs = Math.floor((durationMs % 60000) / 1000);
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
