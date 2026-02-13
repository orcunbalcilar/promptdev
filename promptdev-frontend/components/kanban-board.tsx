"use client";

import { Badge } from "@/components/ui/badge";
import type { Task, TaskStatus } from "@/lib/api";
import { TaskCard } from "./task-card";

interface KanbanBoardProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
}

interface KanbanColumn {
  title: string;
  statuses: TaskStatus[];
  color: string;
}

const columns: KanbanColumn[] = [
  {
    title: "Pending",
    statuses: ["PENDING", "QUEUED", "TRIAGING"],
    color: "bg-muted/50 border-muted",
  },
  {
    title: "In Progress",
    statuses: ["IN_PROGRESS", "VALIDATING", "ITERATION_PENDING"],
    color: "bg-blue-50/50 border-blue-100",
  },
  {
    title: "Review",
    statuses: ["REVIEWING", "CODE_GENERATED", "COMMITTING", "PUSHING", "CREATING_PR"],
    color: "bg-teal-50/50 border-teal-100",
  },
  {
    title: "Completed",
    statuses: ["COMPLETED"],
    color: "bg-green-50/50 border-green-100",
  },
  {
    title: "Stopped",
    statuses: ["FAILED", "CANCELLED"],
    color: "bg-red-50/50 border-red-100",
  },
];

export function KanbanBoard({
  tasks,
  onTaskClick,
}: Readonly<KanbanBoardProps>) {
  const getTasksForColumn = (column: KanbanColumn) => {
    return tasks.filter((task) => column.statuses.includes(task.status));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 h-full">
      {columns.map((column) => {
        const columnTasks = getTasksForColumn(column);
        return (
          <div key={column.title} className="flex flex-col h-full space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm tracking-tight">
                {column.title}
              </h2>
              <Badge variant="secondary" className="text-xs font-mono">
                {columnTasks.length}
              </Badge>
            </div>

            <div
              className={`flex flex-col gap-3 rounded-lg border p-2 h-full min-h-125 ${column.color}`}
            >
              {columnTasks.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-sm text-muted-foreground border border-dashed rounded-md bg-background/50">
                  No tasks
                </div>
              ) : (
                columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => onTaskClick?.(task)}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
