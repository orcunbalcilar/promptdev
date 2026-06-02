"use client";

import type { Task } from "@/lib/api";
import { STATUS_GROUPS, STATUS_GROUP_STYLES } from "@/lib/task-statuses";
import { TaskCard } from "./task-card";

interface KanbanBoardProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
}

export function KanbanBoard({
  tasks,
  onTaskClick,
}: Readonly<KanbanBoardProps>) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 lg:h-full lg:min-h-0 lg:overflow-hidden">
      {STATUS_GROUPS.map((group) => {
        const columnTasks = tasks.filter((task) =>
          group.statuses.includes(task.status),
        );
        const columnClass = STATUS_GROUP_STYLES[group.label] ?? "";
        return (
          <div
            key={group.label}
            className="flex flex-col lg:h-full gap-3 min-h-0"
          >
            <div className="flex items-center justify-between px-1 shrink-0">
              <h2 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                {group.label}
              </h2>
              <span className="count-badge">{columnTasks.length}</span>
            </div>

            <div
              className={`kanban-column ${columnClass} flex flex-col gap-2.5 flex-1 min-h-48 overflow-y-auto`}
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
