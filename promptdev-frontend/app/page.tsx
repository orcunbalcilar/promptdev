"use client";

import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  API_BASE_URL,
  getTasks,
  type PagedResponse,
  type Task,
} from "@/lib/api";
import { realtimeQueryOptions } from "@/lib/query-policies";
import { createSseSubscription } from "@/lib/sse-client";
import { STATUS_GROUPS } from "@/lib/task-statuses";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Bot,
  CalendarClock,
  Loader2,
  RefreshCw,
  Search,
  Settings,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

// bundle-dynamic-imports: Lazy-load heavy components to reduce initial JS bundle
const CreateTaskDialog = dynamic(
  () =>
    import("@/components/tasks/create-task-dialog").then((m) => ({
      default: m.CreateTaskDialog,
    })),
  { ssr: false },
);
const KanbanBoard = dynamic(
  () =>
    import("@/components/dashboard/kanban-board").then((m) => ({
      default: m.KanbanBoard,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    ),
  },
);

export default function Dashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [workspaceFilter, setWorkspaceFilter] = useState<string>("all");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => getTasks(0, 100),
    staleTime: realtimeQueryOptions.staleTime,
    gcTime: realtimeQueryOptions.gcTime,
    refetchOnWindowFocus: realtimeQueryOptions.refetchOnWindowFocus,
    refetchInterval: 30_000, // 30s fallback polling
  });

  // SSE subscription for real-time task updates using unified client
  useEffect(() => {
    const cleanup = createSseSubscription({
      url: `${API_BASE_URL}/stream/tasks`,
      eventNames: ["task-update"],
      onMessage: (event) => {
        try {
          const updatedTask = JSON.parse(event.data) as Partial<Task> & {
            taskId?: string;
          };
          const taskId = updatedTask.id ?? updatedTask.taskId;

          if (taskId) {
            // Optimistic cache update: merge fields instead of refetching
            const current = queryClient.getQueryData<PagedResponse<Task>>([
              "tasks",
            ]);
            const existingIdx =
              current?.content.findIndex((t) => t.id === taskId) ?? -1;

            if (existingIdx >= 0 && current) {
              const newContent = [...current.content];
              newContent[existingIdx] = {
                ...newContent[existingIdx],
                ...updatedTask,
              } as Task;
              queryClient.setQueryData(["tasks"], {
                ...current,
                content: newContent,
              });
            } else {
              // New task not yet in cache — do a full refetch
              queryClient.invalidateQueries({ queryKey: ["tasks"] });
            }
          } else {
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
          }

          // Toast notifications for terminal statuses
          const title = updatedTask.title ?? "Task";
          const navId = updatedTask.id ?? updatedTask.taskId;
          const action = navId
            ? { label: "View", onClick: () => router.push(`/tasks/${navId}`) }
            : undefined;
          if (updatedTask.status === "COMPLETED")
            toast.success(`Task completed: ${title}`, { action });
          if (updatedTask.status === "FAILED")
            toast.error(`Task failed: ${title}`, { action });
        } catch {
          queryClient.invalidateQueries({ queryKey: ["tasks"] });
        }
      },
    });

    return cleanup;
  }, [queryClient, router]);

  const tasks = useMemo(() => data?.content ?? [], [data?.content]);

  // Client-side filtering
  const filteredTasks = useMemo(() => {
    let result = tasks;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.prompt.toLowerCase().includes(q),
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      const group = STATUS_GROUPS.find((g) => g.label === statusFilter);
      if (group) {
        result = result.filter((t) => group.statuses.includes(t.status));
      }
    }

    // Workspace type filter
    if (workspaceFilter !== "all") {
      result = result.filter((t) => t.workspaceType === workspaceFilter);
    }

    return result;
  }, [tasks, searchQuery, statusFilter, workspaceFilter]);

  const handleTaskClick = (task: Task) => {
    router.push(`/tasks/${task.id}`);
  };

  // Counts for status overview
  const statusCounts = useMemo(() => {
    const active = tasks.filter((t) =>
      ["IN_PROGRESS", "VALIDATING", "ITERATION_PENDING"].includes(t.status),
    ).length;
    const completed = tasks.filter((t) => t.status === "COMPLETED").length;
    const failed = tasks.filter((t) =>
      ["FAILED", "CANCELLED"].includes(t.status),
    ).length;
    return { total: tasks.length, active, completed, failed };
  }, [tasks]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold text-destructive">
            Failed to load tasks
          </h2>
          <p className="text-muted-foreground">
            Please check if the server is running.
          </p>
          <Button onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="header-bar backdrop-blur-sm supports-backdrop-filter:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="bg-linear-to-br from-primary/20 to-primary/5 p-2 rounded-lg">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 32 32"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M8 12l4-4 4 4M16 12l4-4 4 4"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-primary"
                  />
                  <path
                    d="M10 16h12"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    className="text-primary/60"
                  />
                  <path
                    d="M8 20l4 4 4-4M16 20l4 4 4-4"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-primary"
                  />
                </svg>
              </div>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight leading-none">
                PromptDev
              </h1>
              <p className="text-[11px] text-muted-foreground leading-none mt-0.5">
                AI Development Platform
              </p>
            </div>
          </div>
          <nav className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8"
              onClick={() => router.push("/scheduled-jobs")}
            >
              <CalendarClock className="h-3.5 w-3.5 mr-1.5" />
              Jobs
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8"
              onClick={() => router.push("/monitoring")}
            >
              <Activity className="h-3.5 w-3.5 mr-1.5" />
              Monitor
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8"
              onClick={() => router.push("/copilot")}
            >
              <Bot className="h-3.5 w-3.5 mr-1.5" />
              Copilot
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8"
              onClick={() => router.push("/settings")}
            >
              <Settings className="h-3.5 w-3.5 mr-1.5" />
              Settings
            </Button>
            <div className="w-px h-5 bg-border mx-1" />
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => refetch()}
              disabled={isLoading}
              title="Refresh"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
              />
            </Button>
            <CreateTaskDialog />
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-6 py-6">
        {(() => {
          if (isLoading && tasks.length === 0) {
            return (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            );
          }

          if (tasks.length === 0) {
            return (
              <div className="text-center py-24 space-y-4">
                <div className="bg-linear-to-br from-primary/10 to-primary/5 p-8 rounded-2xl w-fit mx-auto">
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 32 32"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-primary/60"
                  >
                    <path
                      d="M8 12l4-4 4 4M16 12l4-4 4 4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M10 16h12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <path
                      d="M8 20l4 4 4-4M16 20l4 4 4-4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold tracking-tight">
                  No tasks yet
                </h2>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  Create your first task to get started with AI-powered
                  development.
                </p>
                <div className="pt-4">
                  <CreateTaskDialog />
                </div>
              </div>
            );
          }

          return (
            <>
              {/* Stats bar */}
              <div className="flex items-center gap-6 mb-5">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground text-sm">
                    {statusCounts.total} tasks
                  </span>
                  {statusCounts.active > 0 && (
                    <span className="flex items-center gap-1.5">
                      <span className="live-dot" />
                      {statusCounts.active} running
                    </span>
                  )}
                  <span>{statusCounts.completed} completed</span>
                  {statusCounts.failed > 0 && (
                    <span className="text-destructive">
                      {statusCounts.failed} failed
                    </span>
                  )}
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <div className="relative flex-1 min-w-50 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-sm"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-37.5 h-9 text-sm">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {STATUS_GROUPS.map((g) => (
                      <SelectItem key={g.label} value={g.label}>
                        {g.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={workspaceFilter}
                  onValueChange={setWorkspaceFilter}
                >
                  <SelectTrigger className="w-37.5 h-9 text-sm">
                    <SelectValue placeholder="Workspace" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Workspaces</SelectItem>
                    <SelectItem value="BITBUCKET">Bitbucket</SelectItem>
                    <SelectItem value="LOCAL">Local</SelectItem>
                  </SelectContent>
                </Select>
                {(searchQuery ||
                  statusFilter !== "all" ||
                  workspaceFilter !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 text-xs gap-1"
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilter("all");
                      setWorkspaceFilter("all");
                    }}
                  >
                    <X className="h-3 w-3" />
                    Clear
                  </Button>
                )}
              </div>

              <KanbanBoard
                tasks={filteredTasks}
                onTaskClick={handleTaskClick}
              />
            </>
          );
        })()}
      </main>
    </div>
  );
}
