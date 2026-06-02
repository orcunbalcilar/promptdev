"use client";

import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useEffect } from "react";

export default function SettingsError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  useEffect(() => {
    console.error("Settings error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8">
      <h2 className="text-xl font-semibold text-destructive">Settings error</h2>
      <p className="text-muted-foreground text-center max-w-md">{error.message}</p>
      <Button onClick={reset} variant="outline">
        <RefreshCw className="h-4 w-4 mr-2" />
        Try again
      </Button>
    </div>
  );
}
