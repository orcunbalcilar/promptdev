"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Activity,
  Bot,
  CalendarClock,
  Home,
  Plus,
  Settings,
} from "lucide-react";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K / Ctrl+K → open command palette
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }

      // Cmd+N / Ctrl+N → delegate to create-task-dialog trigger
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        const trigger = document.querySelector<HTMLButtonElement>(
          "[data-create-task-trigger]",
        );
        trigger?.click();
      }
    };

    globalThis.addEventListener("keydown", handleKeyDown);
    return () => globalThis.removeEventListener("keydown", handleKeyDown);
  }, []);

  const navigate = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen} showCloseButton={false}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => navigate("/")}>
            <Home className="h-4 w-4" />
            Dashboard
          </CommandItem>
          <CommandItem onSelect={() => navigate("/scheduled-jobs")}>
            <CalendarClock className="h-4 w-4" />
            Scheduled Jobs
          </CommandItem>
          <CommandItem onSelect={() => navigate("/monitoring")}>
            <Activity className="h-4 w-4" />
            Monitoring
          </CommandItem>
          <CommandItem onSelect={() => navigate("/copilot")}>
            <Bot className="h-4 w-4" />
            Copilot Chat
          </CommandItem>
          <CommandItem onSelect={() => navigate("/settings")}>
            <Settings className="h-4 w-4" />
            Settings
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() => {
              setOpen(false);
              const trigger = document.querySelector<HTMLButtonElement>(
                "[data-create-task-trigger]",
              );
              trigger?.click();
            }}
          >
            <Plus className="h-4 w-4" />
            New Task
            <CommandShortcut>⌘N</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Keyboard Shortcuts">
          <CommandItem disabled>
            <span className="text-muted-foreground">Command Palette</span>
            <CommandShortcut>⌘K</CommandShortcut>
          </CommandItem>
          <CommandItem disabled>
            <span className="text-muted-foreground">New Task</span>
            <CommandShortcut>⌘N</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
