/**
 * Task status group configuration.
 * PRD-16: Single source of truth for status taxonomy.
 */
import type { TaskStatus } from "@/lib/api";

export interface StatusGroup {
  label: string;
  statuses: TaskStatus[];
}

export const STATUS_GROUPS: StatusGroup[] = [
  { label: "Pending", statuses: ["PENDING", "QUEUED", "TRIAGING"] },
  { label: "In Progress", statuses: ["IN_PROGRESS", "VALIDATING", "ITERATION_PENDING"] },
  { label: "Review", statuses: ["REVIEWING", "CODE_GENERATED", "COMMITTING", "PUSHING", "CREATING_PR"] },
  { label: "Completed", statuses: ["COMPLETED"] },
  { label: "Failed", statuses: ["FAILED", "CANCELLED"] },
];

/** CSS class for each Kanban column's colored top border.
 * Note: "Failed" maps to "kanban-column-stopped" for backward compatibility with existing CSS. */
export const STATUS_GROUP_STYLES: Record<string, string> = {
  "Pending": "kanban-column-pending",
  "In Progress": "kanban-column-progress",
  "Review": "kanban-column-review",
  "Completed": "kanban-column-completed",
  "Failed": "kanban-column-stopped",
};

/**
 * Find the group label for a given task status.
 * Returns "Other" for unknown statuses so tasks are never silently dropped.
 */
export function getStatusGroup(status: TaskStatus): string {
  return STATUS_GROUPS.find((g) => g.statuses.includes(status))?.label ?? "Other";
}
