"use client";

import { Button } from "@/components/ui/button";
import { getScheduledJobs, type ScheduledJob } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarClock, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { CreateJobDialog, JobCard } from "./_components";

export default function ScheduledJobsPage() {
  const router = useRouter();

  const {
    data: jobs = [],
    isLoading,
    error,
  } = useQuery<ScheduledJob[]>({
    queryKey: ["scheduled-jobs"],
    queryFn: () => getScheduledJobs(),
    refetchInterval: 30_000,
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-bold tracking-tight">
                Scheduled Jobs
              </h1>
            </div>
          </div>
          <CreateJobDialog />
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <p className="text-destructive">Failed to load scheduled jobs.</p>
          </div>
        )}

        {!isLoading && !error && jobs.length === 0 && (
          <div className="text-center py-24 space-y-4">
            <div className="bg-muted/50 p-6 rounded-full w-fit mx-auto">
              <CalendarClock className="h-12 w-12 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">
              No scheduled jobs
            </h2>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Create recurring jobs for automated maintenance, code review, test
              coverage, and more.
            </p>
            <div className="pt-4">
              <CreateJobDialog />
            </div>
          </div>
        )}

        {!isLoading && jobs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
