"use client";

import {
  ChangedFilesTree,
} from "@/components/agent-activity-stream";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  cancelTask,
  getTask,
  getTaskEvents,
  resumeTask,
  startTask,
  subscribeToTaskEvents,
  type TaskEvent,
} from "@/lib/api";
import { getMonitoringSessionDetails } from "@/lib/monitoring";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ModelInfo } from "@github/copilot-sdk";
import {
  ArrowLeft,
  Bot,
  Files,
  Loader2,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  statusColors,
  TaskHeaderActions,
  TaskSidebar,
  ResumeForm,
} from "../_components";

// Lazy-load heaviest components
const AgentActivityStream = dynamic(
  () => import("@/components/agent-activity-stream").then((m) => ({ default: m.AgentActivityStream })),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-32"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div> },
);
const TaskChangesSummary = dynamic(
  () => import("@/components/task-changes-summary").then((m) => ({ default: m.TaskChangesSummary })),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-32"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div> },
);

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const queryClient = useQueryClient();
  const [realtimeEvents, setRealtimeEvents] = useState<TaskEvent[]>([]);
  const [showResumeForm, setShowResumeForm] = useState(false);
  const [resumePrompt, setResumePrompt] = useState("");
  const [isResuming, setIsResuming] = useState(false);
  const [showFilesPanel, setShowFilesPanel] = useState(true);

  // Fetch available models for name lookup
  const { data: models = [] } = useQuery<ModelInfo[]>({
    queryKey: ["copilot-models"],
    queryFn: async () => {
      const res = await fetch('/api/copilot/models');
      if (!res.ok) return [];
      const data = await res.json();
      return data.models || [];
    },
    initialData: [],
  });

  // Fetch task details
  const {
    data: task,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["task", id],
    queryFn: () => getTask(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && ["COMPLETED", "FAILED", "CANCELLED"].includes(status)
        ? false
        : 3000;
    },
  });

  // Fetch initial events
  const { data: initialEvents } = useQuery({
    queryKey: ["task-events", id],
    queryFn: () => getTaskEvents(id),
  });

  // Fetch monitoring session details (if copilotSessionId is available)
  const { data: sessionDetails } = useQuery({
    queryKey: ["monitoring-session", task?.copilotSessionId],
    queryFn: () => getMonitoringSessionDetails(task!.copilotSessionId!),
    enabled: !!task?.copilotSessionId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "ACTIVE" ? 5000 : false;
    },
  });

  // Subscribe to real-time events
  useEffect(() => {
    if (!id) return;

    // Clear previous realtime events when ID changes
    // setRealtimeEvents([]) - moved to cleanup to avoid sync state update warning

    const unsubscribe = subscribeToTaskEvents(
      id,
      (event: TaskEvent) => {
        setRealtimeEvents((prev) => [...prev, event]);
        // Invalidate task query to get latest status if event suggests progress
        queryClient.invalidateQueries({ queryKey: ["task", id] });
      },
      (error: unknown) => {
        console.error("SSE Error:", error);
      },
    );

    return () => {
      unsubscribe();
      setRealtimeEvents([]);
    };
  }, [id, queryClient]);

  // Combine and sort events
  const allEvents = [
    ...(initialEvents ?? []),
    ...realtimeEvents.filter(
      (e) => !(initialEvents ?? []).some((ie) => ie.id === e.id),
    ),
  ].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const isLive = !["COMPLETED", "FAILED", "CANCELLED"].includes(
    task?.status ?? "",
  );

  const handleCancel = async () => {
    if (!task) return;
    if (!globalThis.confirm("Are you sure you want to cancel this task?"))
      return;

    try {
      await cancelTask(task.id);
      queryClient.invalidateQueries({ queryKey: ["task", id] });
      toast.success("Task cancelled");
    } catch (e) {
      console.error("Failed to cancel task:", e);
      toast.error("Failed to cancel task");
    }
  };

  const handleRetry = async () => {
    if (!task) return;
    try {
      await startTask(task.id);
      queryClient.invalidateQueries({ queryKey: ["task", id] });
      setRealtimeEvents([]); // Reset realtime events on retry
    } catch (e) {
      console.error("Failed to retry task:", e);
      toast.error("Failed to retry task");
    }
  };

  const handleResume = async () => {
    if (!task || !resumePrompt.trim()) return;
    setIsResuming(true);
    try {
      await resumeTask(task.id, resumePrompt.trim());
      queryClient.invalidateQueries({ queryKey: ["task", id] });
      setShowResumeForm(false);
      setResumePrompt("");
      setRealtimeEvents([]);
    } catch (e) {
      console.error("Failed to resume task:", e);
      toast.error("Failed to resume task");
    } finally {
      setIsResuming(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold text-destructive">
            Task not found
          </h2>
          <Button onClick={() => router.push("/")} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading || !task) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold tracking-tight line-clamp-1">
                  {task.title}
                </h1>
                <Badge
                  variant="outline"
                  className={cn("capitalize border", statusColors[task.status])}
                >
                  {task.status.replace("_", " ").toLowerCase()}
                </Badge>
              </div>
            </div>
            <TaskHeaderActions
              task={task}
              showResumeForm={showResumeForm}
              setShowResumeForm={setShowResumeForm}
              onRetry={handleRetry}
              onCancel={handleCancel}
            />
          </div>
        </div>
      </header>

      {/* Resume Form */}
      {showResumeForm && (
        <ResumeForm
          resumePrompt={resumePrompt}
          setResumePrompt={setResumePrompt}
          isResuming={isResuming}
          onResume={handleResume}
          onClose={() => {
            setShowResumeForm(false);
            setResumePrompt("");
          }}
        />
      )}

      {/* Main Content - 3 Panel Layout */}
      <main className="flex-1 overflow-hidden">
        <div className="flex h-[calc(100vh-4rem)] divide-x">
          {/* Left Panel - Task Info */}
          <TaskSidebar
            task={task}
            isLive={isLive}
            models={models}
            sessionDetails={sessionDetails}
            allEvents={allEvents}
          />

          {/* Center Panel - Agent Activity Stream / Changes Summary */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            <Tabs
              defaultValue="activity"
              className="flex flex-col flex-1 min-h-0 gap-0"
            >
              <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
                <TabsList variant="line" className="h-auto">
                  <TabsTrigger
                    value="activity"
                    className="text-xs gap-1.5 px-3 py-1.5"
                  >
                    <Bot className="h-3.5 w-3.5" />
                    Live Activity
                    <Badge
                      variant="secondary"
                      className="font-mono text-[10px] ml-1"
                    >
                      {allEvents.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger
                    value="changes"
                    className="text-xs gap-1.5 px-3 py-1.5"
                  >
                    <Files className="h-3.5 w-3.5" />
                    Changes Summary
                  </TabsTrigger>
                </TabsList>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setShowFilesPanel(!showFilesPanel)}
                  title={
                    showFilesPanel ? "Hide files panel" : "Show files panel"
                  }
                >
                  {showFilesPanel ? (
                    <PanelRightClose className="h-4 w-4" />
                  ) : (
                    <PanelRightOpen className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <TabsContent
                value="activity"
                className="flex-1 overflow-hidden mt-0"
              >
                <AgentActivityStream
                  events={allEvents}
                  task={task}
                  isLive={isLive}
                />
              </TabsContent>
              <TabsContent
                value="changes"
                className="flex-1 overflow-hidden mt-0"
              >
                <TaskChangesSummary events={allEvents} task={task} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Panel - Changed Files */}
          {showFilesPanel && (
            <div className="w-64 shrink-0 flex flex-col overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-muted/30">
                <Files className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Changed Files</h2>
              </div>
              <div className="flex-1 overflow-y-auto">
                <ChangedFilesTree events={allEvents} />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
