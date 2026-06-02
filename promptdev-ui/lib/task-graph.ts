/**
 * Task dependency graph utilities for visualizing task relationships.
 */
import type { Task } from "@/lib/api";

export interface TaskNode {
  id: string;
  title: string;
  status: string;
  level: number;
}

export interface TaskEdge {
  source: string;
  target: string;
  label?: string;
}

export interface TaskGraph {
  nodes: TaskNode[];
  edges: TaskEdge[];
}

/**
 * Build a dependency graph from tasks that share the same repository.
 * Tasks are linked by creation order within the same repo.
 */
export function buildTaskGraph(tasks: Task[]): TaskGraph {
  const nodes: TaskNode[] = [];
  const edges: TaskEdge[] = [];

  // Group tasks by repository
  const byRepo = new Map<string, Task[]>();
  for (const task of tasks) {
    const key = task.repositorySlug;
    if (!byRepo.has(key)) byRepo.set(key, []);
    byRepo.get(key)!.push(task);
  }

  let level = 0;
  for (const [, repoTasks] of byRepo) {
    const sorted = [...repoTasks].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    for (let i = 0; i < sorted.length; i++) {
      nodes.push({
        id: sorted[i].id,
        title: sorted[i].title,
        status: sorted[i].status,
        level,
      });

      if (i > 0) {
        edges.push({
          source: sorted[i - 1].id,
          target: sorted[i].id,
          label: "followed by",
        });
      }
    }
    level++;
  }

  return { nodes, edges };
}

/**
 * Calculate graph statistics.
 */
export function getGraphStats(graph: TaskGraph): {
  totalNodes: number;
  totalEdges: number;
  maxDepth: number;
  isolatedNodes: number;
} {
  const connectedNodes = new Set<string>();
  for (const edge of graph.edges) {
    connectedNodes.add(edge.source);
    connectedNodes.add(edge.target);
  }

  return {
    totalNodes: graph.nodes.length,
    totalEdges: graph.edges.length,
    maxDepth: Math.max(0, ...graph.nodes.map((n) => n.level)),
    isolatedNodes: graph.nodes.filter((n) => !connectedNodes.has(n.id)).length,
  };
}
