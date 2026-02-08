"use client";

import { CreateTaskDialog } from "@/components/create-task-dialog";
import { KanbanBoard } from "@/components/kanban-board";
import { Button } from "@/components/ui/button";
import { getTasks, type Task } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Activity, Bot, CalendarClock, Loader2, RefreshCw, Settings, Zap } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => getTasks(0, 100),
    refetchInterval: 5000,
  });

  const tasks = data?.content ?? [];

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

          return <KanbanBoard tasks={tasks} onTaskClick={handleTaskClick} />;
        })()}
      </main>
    </div>
  );
}
