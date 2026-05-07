"use client";

import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Bot,
  CalendarClock,
  RefreshCw,
  Settings,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";

const CreateTaskDialog = dynamic(
  () =>
    import("@/components/tasks/create-task-dialog").then((m) => ({
      default: m.CreateTaskDialog,
    })),
  { ssr: false },
);

export function Header() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["tasks"] });
    setTimeout(() => setIsRefreshing(false), 500); // Visual feedback
  };

  return (
    <header className="header-bar backdrop-blur-xl supports-backdrop-filter:bg-background/60 sticky top-0 z-50 border-b border-border/40 bg-background/80">
      <div className="container mx-auto px-6 h-14 flex items-center justify-between">
        <div 
          className="flex items-center gap-3 cursor-pointer" 
          onClick={() => router.push("/")}
        >
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
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Refresh"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </Button>
          <CreateTaskDialog />
        </nav>
      </div>
    </header>
  );
}
