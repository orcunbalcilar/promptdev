import { Header } from "@/components/layout/header";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import * as taskService from "@/lib/services/task-service";
import { STATUS_GROUPS } from "@/lib/task-statuses";
import { adaptTask } from "@/lib/task-adapter";

// Force dynamic rendering since we read search params and DB
export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}>) {
  const resolvedSearchParams = await searchParams;
  const page = Number(resolvedSearchParams.page ?? 0);
  const size = Number(resolvedSearchParams.size ?? 100);
  const statusFilter = resolvedSearchParams.status as string | undefined;
  const search = resolvedSearchParams.search as string | undefined;
  const workspaceType = resolvedSearchParams.workspaceType as
    | string
    | undefined;

  let statuses: string[] | undefined;
  if (statusFilter && statusFilter !== "all") {
    const group = STATUS_GROUPS.find((g) => g.label === statusFilter);
    if (group) {
      statuses = group.statuses;
    } else {
      statuses = statusFilter.split(",").map((s) => s.trim());
    }
  }

  // Fetch initial data on server
  let initialTasks;
  try {
    const result = await taskService.getAllTasks(page, size, {
      search,
      statuses,
      workspaceType: workspaceType === "all" ? undefined : workspaceType,
    });
    initialTasks = {
      ...result,
      content: result.content.map(adaptTask),
    };
  } catch (e) {
    console.error("Failed to fetch initial tasks:", e);
    // Fallback to empty or let client fetch
    initialTasks = undefined;
  }

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-background flex flex-col">
      <Header />
      <main className="flex-1 lg:overflow-hidden">
        <DashboardView initialTasks={initialTasks} />
      </main>
    </div>
  );
}
