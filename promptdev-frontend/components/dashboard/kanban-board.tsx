"use client";

import type { Task, TaskStatus } from "@/lib/api";
import { TaskCard } from "./task-card";

interface KanbanBoardProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
}

interface KanbanColumn {
  title: string;
  statuses: TaskStatus[];
  columnClass: string;
}

const columns: KanbanColumn[] = [
  {
    title: "Pending",
    statuses: ["PENDING", "QUEUED", "TRIAGING"],
    columnClass: "kanban-column-pending",
  },
  {
    title: "In Progress",
    statuses: ["IN_PROGRESS", "VALIDATING", "ITERATION_PENDING"],
    columnClass: "kanban-column-progress",
  },
  {
    title: "Review",
    statuses: [
      "REVIEWING",
      "CODE_GENERATED",
      "COMMITTING",
      "PUSHING",
      "CREATING_PR",
    ],
    columnClass: "kanban-column-review",
  },
  {
    title: "Completed",
    statuses: ["COMPLETED"],
    columnClass: "kanban-column-completed",
  },
  {
    title: "Stopped",
    statuses: ["FAILED", "CANCELLED"],
    columnClass: "kanban-column-stopped",
  },
];

export function KanbanBoard({
  tasks,
  onTaskClick,
}: Readonly<KanbanBoardProps>) {
  const getTasksForColumn = (column: KanbanColumn) => {
    return tasks.filter((task) => column.statuses.includes(task.status));
  };

  console.log("Rendering KanbanBoard with tasks:", tasks);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 lg:h-full lg:min-h-0 lg:overflow-hidden">
      {columns.map((column) => {
        const columnTasks = getTasksForColumn(column);
        return (
          <div key={column.title} className="flex flex-col lg:h-full gap-3 min-h-0">
            <div className="flex items-center justify-between px-1 shrink-0">
              <h2 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                {column.title}
              </h2>
              <span className="count-badge">{columnTasks.length}</span>
            </div>

            <div
              className={`kanban-column ${column.columnClass} flex flex-col gap-2.5 flex-1 min-h-48 overflow-y-auto`}
            >
              {columnTasks.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-xs text-muted-foreground/60 border border-dashed border-border/40 rounded-lg">
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
