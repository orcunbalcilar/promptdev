/**
 * Task export utilities for generating CSV and JSON reports.
 */
import type { Task } from "@/lib/api";

export type ExportFormat = "csv" | "json";

interface ExportOptions {
  format: ExportFormat;
  filename?: string;
  fields?: (keyof Task)[];
}

const DEFAULT_FIELDS: (keyof Task)[] = [
  "id",
  "title",
  "status",
  "repositorySlug",
  "workspaceType",
  "sourceBranch",
  "targetBranch",
  "modelId",
  "createdAt",
  "updatedAt",
  "completedAt",
];

function escapeCSV(value: unknown): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replaceAll('"', '""')}"`;
  }
  return str;
}

export function tasksToCSV(
  tasks: Task[],
  fields: (keyof Task)[] = DEFAULT_FIELDS,
): string {
  const header = fields.join(",");
  const rows = tasks.map((task) =>
    fields.map((field) => escapeCSV(task[field])).join(","),
  );
  return [header, ...rows].join("\n");
}

export function tasksToJSON(tasks: Task[], fields?: (keyof Task)[]): string {
  const data = fields
    ? tasks.map((task) => {
        const filtered: Record<string, unknown> = {};
        for (const field of fields) {
          filtered[field] = task[field];
        }
        return filtered;
      })
    : tasks;
  return JSON.stringify(data, null, 2);
}

export function exportTasks(tasks: Task[], options: ExportOptions): void {
  const { format, fields } = options;
  const filename =
    options.filename ??
    `tasks-export-${new Date().toISOString().split("T")[0]}`;

  const content =
    format === "csv" ? tasksToCSV(tasks, fields) : tasksToJSON(tasks, fields);

  const mimeType = format === "csv" ? "text/csv" : "application/json";
  const extension = format === "csv" ? ".csv" : ".json";

  if (globalThis.window !== undefined) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
