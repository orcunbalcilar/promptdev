"use client";

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
import { Loader2, RefreshCw, Search, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";

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

interface DashboardViewProps {
  initialTasks?: PagedResponse<Task>;
}

export function DashboardView({ initialTasks }: DashboardViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  // Initialize state from URL params
  const initialSearch = searchParams.get("search") || "";
  const initialStatus = searchParams.get("status") || "all";
  const initialWorkspace = searchParams.get("workspaceType") || "all";

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [debouncedSearch] = useDebounce(searchQuery, 300);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [workspaceFilter, setWorkspaceFilter] = useState(initialWorkspace);

  // Sync URL with state
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (workspaceFilter !== "all") params.set("workspaceType", workspaceFilter);
    
    router.push(`/?${params.toString()}`, { scroll: false });
  }, [debouncedSearch, statusFilter, workspaceFilter, router]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["tasks", debouncedSearch, statusFilter, workspaceFilter],
    queryFn: () => getTasks(0, 100, {
      search: debouncedSearch,
      status: statusFilter,
      workspaceType: workspaceFilter
    }),
    initialData: initialTasks,
    staleTime: realtimeQueryOptions.staleTime,
    gcTime: realtimeQueryOptions.gcTime,
    refetchOnWindowFocus: realtimeQueryOptions.refetchOnWindowFocus,
    refetchInterval: 30_000,
  });

  // SSE subscription
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
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
          }

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

  const handleTaskClick = (task: Task) => {
    router.push(`/tasks/${task.id}`);
  };

  const statusCounts = useMemo(() => {
    // This count is only for the fetched tasks (current page/filter)
    // Ideally we should fetch global counts from API, but for now this mimics previous behavior
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

  if (isLoading && tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (tasks.length === 0 && !searchQuery && statusFilter === "all" && workspaceFilter === "all") {
    return (
      <div className="text-center py-24 space-y-4 h-full flex flex-col items-center justify-center">
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
    <div className="container mx-auto px-6 py-6 lg:h-full flex flex-col lg:min-h-0 page-enter">
      {/* Stats bar */}
      <div className="flex items-center gap-6 mb-5 shrink-0 glass-panel px-4 py-2.5 rounded-xl">
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
      <div className="flex flex-wrap items-center gap-3 mb-6 shrink-0">
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
        tasks={tasks}
        onTaskClick={handleTaskClick}
      />
    </div>
  );
}
