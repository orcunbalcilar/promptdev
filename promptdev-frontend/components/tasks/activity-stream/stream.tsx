"use client";

import type { Task, TaskEvent } from "@/lib/api";
import { useEffect, useMemo, useRef } from "react";

import { Shimmer } from "@/components/ai-elements/shimmer";
import { Loader2 } from "lucide-react";

import { groupEvents } from "./event-grouping";
import { renderGroupedEvent } from "./event-renderers";

interface AgentActivityStreamProps {
  events: TaskEvent[];
  task: Task;
  isLive: boolean;
  isProcessing?: boolean;
}

export function AgentActivityStream({
  events,
  task,
  isLive,
  isProcessing,
}: Readonly<AgentActivityStreamProps>) {
  const endRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const groups = useMemo(() => groupEvents(events), [events]);

  useEffect(() => {
    /* v8 ignore start -- ref always available after mount */
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth" });
    }
    /* v8 ignore stop */
  }, [groups.length]);

  const shouldShowProcessing =
    isProcessing ??
    (isLive && !["COMPLETED", "FAILED", "CANCELLED"].includes(task.status));

  return (
    <div ref={containerRef} className="flex flex-col h-full overflow-y-auto">
      <div className="flex-1 space-y-4 p-4">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-3 py-16">
            <Loader2 className="size-8 animate-spin opacity-20" />
            <p className="text-sm">Waiting for agent activity...</p>
          </div>
        ) : (
          groups.map((group) => (
            <div
              key={group.key}
              className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
            >
              {renderGroupedEvent(group, task, shouldShowProcessing)}
            </div>
          ))
        )}

        {shouldShowProcessing && (
          <div className="flex items-center gap-2 py-2">
            <Shimmer>Processing...</Shimmer>
          </div>
        )}

        <div ref={endRef} />
      </div>
    </div>
  );
}
