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
import { API_BASE_URL, getTasks, type PagedResponse, type Task, type TaskStatus } from "@/lib/api";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Bot, CalendarClock, Loader2, RefreshCw, Search, Settings, Zap } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

// bundle-dynamic-imports: Lazy-load heavy components to reduce initial JS bundle
const CreateTaskDialog = dynamic(
  () => import("@/components/create-task-dialog").then((m) => ({ default: m.CreateTaskDialog })),
  { ssr: false },
);
const KanbanBoard = dynamic(
  () => import("@/components/kanban-board").then((m) => ({ default: m.KanbanBoard })),
  { ssr: false, loading: () => <div className="h-64 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> },
);

const STATUS_GROUPS: { label: string; statuses: TaskStatus[] }[] = [
  { label: "Pending", statuses: ["PENDING", "QUEUED", "TRIAGING"] },
  { label: "In Progress", statuses: ["IN_PROGRESS", "VALIDATING", "ITERATION_PENDING"] },
  { label: "Review", statuses: ["REVIEWING", "CODE_GENERATED", "COMMITTING", "PUSHING", "CREATING_PR"] },
  { label: "Completed", statuses: ["COMPLETED"] },
  { label: "Failed", statuses: ["FAILED", "CANCELLED"] },
];

export default function Dashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [workspaceFilter, setWorkspaceFilter] = useState<string>("all");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => getTasks(0, 100),
    refetchInterval: 30_000, // 30s fallback polling
  });

  // SSE subscription for real-time task updates
  useEffect(() => {
    const eventSource = new EventSource(`${API_BASE_URL}/stream/tasks`);

    eventSource.addEventListener("task-update", (event) => {
      try {
        const updatedTask = JSON.parse(event.data) as Partial<Task> & { taskId?: string };
        const taskId = updatedTask.id ?? updatedTask.taskId;

        if (taskId) {
          // Optimistic cache update: merge fields instead of refetching
          const current = queryClient.getQueryData<PagedResponse<Task>>(["tasks"]);
          const existingIdx = current?.content.findIndex((t) => t.id === taskId) ?? -1;

          if (existingIdx >= 0 && current) {
            const newContent = [...current.content];
            newContent[existingIdx] = { ...newContent[existingIdx], ...updatedTask } as Task;
            queryClient.setQueryData(["tasks"], { ...current, content: newContent });
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
        const action = navId ? { label: "View", onClick: () => router.push(`/tasks/${navId}`) } : undefined;
        if (updatedTask.status === "COMPLETED") toast.success(`Task completed: ${title}`, { action });
        if (updatedTask.status === "FAILED") toast.error(`Task failed: ${title}`, { action });
      } catch {
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
      }
    });

    eventSource.onerror = () => {
      // SSE failed — 30s polling is the fallback
    };

    return () => eventSource.close();
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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold text-destructive">
            Failed to load tasks
          </h2>
          <p className="text-muted-foreground">
            Please check if the backend is running.
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
      <header className="border-b bg-card/50 backdrop-blur supports-backdrop-filter:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-full">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">PromptDev</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/scheduled-jobs")}
            >
              <CalendarClock className="h-4 w-4 mr-2" />
              Scheduled Jobs
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/monitoring")}
            >
              <Activity className="h-4 w-4 mr-2" />
              Monitoring
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/copilot")}
            >
              <Bot className="h-4 w-4 mr-2" />
              Copilot Agent
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/settings")}
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <CreateTaskDialog />
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
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
                <div className="bg-muted/50 p-6 rounded-full w-fit mx-auto">
                  <Zap className="h-12 w-12 text-muted-foreground" />
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
              {/* Search & Filter Bar */}
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <div className="relative flex-1 min-w-50 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-37.5">
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
                <Select value={workspaceFilter} onValueChange={setWorkspaceFilter}>
                  <SelectTrigger className="w-37.5">
                    <SelectValue placeholder="Workspace" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Workspaces</SelectItem>
                    <SelectItem value="BITBUCKET">Bitbucket</SelectItem>
                    <SelectItem value="LOCAL">Local</SelectItem>
                  </SelectContent>
                </Select>
                {(searchQuery || statusFilter !== "all" || workspaceFilter !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilter("all");
                      setWorkspaceFilter("all");
                    }}
                  >
                    Clear filters
                  </Button>
                )}
              </div>

              <KanbanBoard tasks={filteredTasks} onTaskClick={handleTaskClick} />
            </>
          );
        })()}
      </main>
    </div>
  );
}
