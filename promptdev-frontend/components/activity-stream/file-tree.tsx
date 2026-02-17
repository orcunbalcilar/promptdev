"use client";

import type { EventType, TaskEvent } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight, FileIcon, FolderIcon } from "lucide-react";
import { parseFileChanges } from "./helpers";
import type { FileChangeStatus } from "./types";

// ── Tree data structure ─────────────────────────────────────────

interface TreeNode {
  name: string;
  path: string;
  status?: FileChangeStatus;
  children: Map<string, TreeNode>;
}

function buildFileTree(
  files: { path: string; status: FileChangeStatus }[],
): TreeNode {
  const root: TreeNode = { name: "", path: "", children: new Map() };

  for (const file of files) {
    const segments = file.path.split("/");
    let current = root;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const isFile = i === segments.length - 1;

      if (!current.children.has(segment)) {
        current.children.set(segment, {
          name: segment,
          path: segments.slice(0, i + 1).join("/"),
          status: isFile ? file.status : undefined,
          children: new Map(),
        });
      } else if (isFile) {
        const existing = current.children.get(segment);
        if (existing) existing.status = file.status;
      }
      current = current.children.get(segment)!;
    }
  }

  return root;
}

function collapseTree(node: TreeNode): TreeNode {
  const collapsed: TreeNode = {
    name: node.name,
    path: node.path,
    status: node.status,
    children: new Map(),
  };

  for (const [, child] of node.children) {
    let current = child;

    while (!current.status && current.children.size === 1) {
      const onlyChild = current.children.values().next().value!;
      current = {
        name: current.name + "/" + onlyChild.name,
        path: onlyChild.path,
        status: onlyChild.status,
        children: onlyChild.children,
      };
    }

    const collapsedChild = collapseTree(current);
    collapsed.children.set(collapsedChild.name, collapsedChild);
  }

  return collapsed;
}

// ── Directory node component ────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  added: "text-green-600",
  modified: "text-yellow-600",
  deleted: "text-red-600",
};

const STATUS_LABELS: Record<string, string> = {
  added: "A",
  modified: "M",
  deleted: "D",
};

const DEPTH_PADDING = [
  "pl-2",
  "pl-5",
  "pl-8",
  "pl-11",
  "pl-14",
  "pl-17",
  "pl-20",
];

function DirectoryNode({
  node,
  depth,
}: Readonly<{ node: TreeNode; depth: number }>) {
  const [isOpen, setIsOpen] = useState(depth < 2);
  const paddingClass = DEPTH_PADDING[Math.min(depth, DEPTH_PADDING.length - 1)];

  const sortedChildren = Array.from(node.children.values()).sort((a, b) => {
    const aIsDir = !a.status;
    const bIsDir = !b.status;
    if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  if (node.status) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded py-0.5 hover:bg-muted/50 transition-colors",
          paddingClass,
        )}
      >
        <span
          className={cn(
            "font-medium shrink-0 w-4 text-center text-[10px]",
            STATUS_COLORS[node.status],
          )}
        >
          {STATUS_LABELS[node.status]}
        </span>
        <FileIcon className="size-3.5 text-muted-foreground shrink-0" />
        <span className="truncate" title={node.path}>
          {node.name}
        </span>
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger
        className={cn(
          "flex w-full items-center gap-1.5 rounded py-0.5 hover:bg-muted/50 transition-colors text-left",
          paddingClass,
        )}
      >
        <ChevronRight
          className={cn(
            "size-3 shrink-0 transition-transform",
            isOpen && "rotate-90",
          )}
        />
        <FolderIcon className="size-3.5 text-muted-foreground shrink-0" />
        <span className="truncate text-muted-foreground">{node.name}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {sortedChildren.map((child) => (
          <DirectoryNode key={child.path} node={child} depth={depth + 1} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

// ── Main component ──────────────────────────────────────────────

export function ChangedFilesTree({
  events,
}: Readonly<{ events: TaskEvent[] }>) {
  const files = useMemo(() => {
    const fileMap = new Map<string, FileChangeStatus>();

    for (const event of events) {
      if (event.filePath) {
        const statusMap: Partial<Record<EventType, FileChangeStatus>> = {
          FILE_CREATED: "added",
          FILE_MODIFIED: "modified",
          FILE_DELETED: "deleted",
          CODE_GENERATED: "modified",
        };
        const status = statusMap[event.eventType];
        if (status) {
          fileMap.set(event.filePath, status);
        }
      }

      if (event.eventType === "GIT_COMMIT" && event.fileChanges) {
        const changes = parseFileChanges(event.fileChanges);
        for (const change of changes) {
          fileMap.set(change.path, change.status);
        }
      }
    }

    return Array.from(fileMap.entries())
      .map(([path, status]) => ({ path, status }))
      .sort((a, b) => a.path.localeCompare(b.path));
  }, [events]);

  const tree = useMemo(() => {
    if (files.length === 0) return null;
    const rawTree = buildFileTree(files);
    return collapseTree(rawTree);
  }, [files]);

  if (!tree || files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
        <FileIcon className="size-8 opacity-20 mb-2" />
        <p className="text-xs">No files changed yet</p>
      </div>
    );
  }

  const sortedRootChildren = Array.from(tree.children.values()).sort(
    (a, b) => {
      const aIsDir = !a.status;
      const bIsDir = !b.status;
      if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    },
  );

  return (
    <div className="space-y-0.5 p-2 font-mono text-xs">
      <div className="flex items-center justify-between px-2 pb-1 text-muted-foreground">
        <span className="text-[10px] uppercase tracking-wider font-semibold">
          Changed Files
        </span>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          {files.length}
        </Badge>
      </div>
      {sortedRootChildren.map((child) => (
        <DirectoryNode key={child.path} node={child} depth={0} />
      ))}
    </div>
  );
}
