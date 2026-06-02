"use client";

import { useState, useEffect, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Clock,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface SessionHistoryItem {
  sessionId: string;
  modifiedTime?: string;
  createdTime?: string;
  title?: string;
}

interface SessionHistorySidebarProps {
  activeSessionId?: string;
  onResumeSession: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
}

export function SessionHistorySidebar({
  activeSessionId,
  onResumeSession,
  onNewSession,
  onDeleteSession,
}: Readonly<SessionHistorySidebarProps>) {
  const [sessions, setSessions] = useState<SessionHistoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/copilot/sessions/history");
      if (res.ok) {
        const data = await res.json();
        /* v8 ignore start -- API always returns sessions array */
        setSessions(data.sessions ?? []);
        /* v8 ignore stop */
      }
    } catch {
      // Non-critical — history is a convenience feature
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const filtered = sessions.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.sessionId.toLowerCase().includes(q) ||
      s.title?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-64 border-r bg-muted/30 flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">History</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onNewSession}
            className="h-7 w-7"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sessions..."
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {/* Session list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {loading && sessions.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-8">
              Loading sessions...
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-8">
              {search ? "No matching sessions" : "No previous sessions"}
            </div>
          )}

          {filtered.map((session) => (
            <div
              key={session.sessionId}
              className={cn(
                "group relative rounded-md p-2 cursor-pointer",
                "hover:bg-accent transition-colors duration-150",
                activeSessionId === session.sessionId && "bg-accent",
              )}
              onClick={() => onResumeSession(session.sessionId)}
            >
              <div className="flex items-start gap-2 min-w-0">
                <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">
                    {session.title || session.sessionId.slice(0, 12) + "..."}
                  </p>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    <span>
                      {session.modifiedTime
                        ? formatDistanceToNow(new Date(session.modifiedTime), {
                            addSuffix: true,
                          })
                        : "Unknown"}
                    </span>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSession(session.sessionId);
                      }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
