import type { ScheduledJobType } from "@/lib/api";
import {
  Code2,
  FileText,
  Search,
  Shield,
  TestTube,
  Wrench,
  Zap,
} from "lucide-react";

export const JOB_TYPE_CONFIG: Record<
  ScheduledJobType,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  }
> = {
  MAINTENANCE: { label: "Maintenance", icon: Wrench, color: "text-orange-500" },
  CODE_REVIEW: { label: "Code Review", icon: Search, color: "text-blue-500" },
  TEST_COVERAGE: { label: "Test Coverage", icon: TestTube, color: "text-green-500" },
  SECURITY_AUDIT: { label: "Security Audit", icon: Shield, color: "text-red-500" },
  PERFORMANCE: { label: "Performance", icon: Zap, color: "text-yellow-500" },
  DOCUMENTATION: { label: "Documentation", icon: FileText, color: "text-purple-500" },
  CUSTOM: { label: "Custom", icon: Code2, color: "text-gray-500" },
};

export const CRON_PRESETS = [
  { label: "Every 15 minutes", value: "0 */15 * * * *" },
  { label: "Every 30 minutes", value: "0 */30 * * * *" },
  { label: "Every hour", value: "0 0 * * * *" },
  { label: "Every 2 hours", value: "0 0 */2 * * *" },
  { label: "Every 4 hours", value: "0 0 */4 * * *" },
  { label: "Every 6 hours", value: "0 0 */6 * * *" },
  { label: "Every 12 hours", value: "0 0 */12 * * *" },
  { label: "Every day at 2 AM", value: "0 0 2 * * *" },
  { label: "Every day at 9 AM", value: "0 0 9 * * *" },
  { label: "Weekdays at 9 AM", value: "0 0 9 * * MON-FRI" },
  { label: "Every Monday at 9 AM", value: "0 0 9 * * MON" },
  { label: "Every Friday at 5 PM", value: "0 0 17 * * FRI" },
  { label: "1st of every month", value: "0 0 0 1 * *" },
  { label: "Custom", value: "custom" },
] as const;

export const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  COMPLETED: "default",
  IN_PROGRESS: "secondary",
  QUEUED: "secondary",
  PENDING: "outline",
  FAILED: "destructive",
  CANCELLED: "outline",
};

/** Returns a human-readable description for a cron expression. */
export function describeCron(cron: string): string {
  const preset = CRON_PRESETS.find((p) => p.value === cron);
  if (preset && preset.value !== "custom") return preset.label;
  // Attempt a rough description from common patterns
  const parts = cron.trim().split(/\s+/);
  if (parts.length < 6) return cron;
  const [, min, hour, dom, , dow] = parts;
  if (min.startsWith("*/")) return `Every ${min.slice(2)} minutes`;
  if (hour.startsWith("*/")) return `Every ${hour.slice(2)} hours`;
  if (dow !== "*" && dow !== "?") {
    const dayName = dow;
    return `${dayName} at ${hour}:${min.padStart(2, "0")}`;
  }
  if (dom !== "*" && dom !== "?")
    return `Day ${dom} of month at ${hour}:${min.padStart(2, "0")}`;
  if (hour !== "*") return `Daily at ${hour}:${min.padStart(2, "0")}`;
  return cron;
}
