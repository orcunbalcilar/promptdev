"use client";

import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export default function CopilotError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  useEffect(() => {
    console.error("Copilot error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8">
      <h2 className="text-xl font-semibold text-destructive">Copilot session error</h2>
      <p className="text-muted-foreground text-center max-w-md">{error.message}</p>
      <div className="flex gap-3">
        <Button onClick={reset} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try again
        </Button>
        <Button asChild variant="ghost">
          <Link href="/">Back to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
