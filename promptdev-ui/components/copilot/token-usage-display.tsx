"use client";

import { Coins, ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface TokenUsageDisplayProps {
  inputTokens: number;
  outputTokens: number;
  className?: string;
}

function formatTokenCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

export function TokenUsageDisplay({
  inputTokens,
  outputTokens,
  className,
}: Readonly<TokenUsageDisplayProps>) {
  const total = inputTokens + outputTokens;

  return (
    <div
      className={cn(
        "flex items-center gap-3 text-xs text-muted-foreground px-3 py-1.5 rounded-full bg-muted/50",
        className,
      )}
    >
      <div className="flex items-center gap-1" title="Total tokens">
        <Coins className="h-3 w-3" />
        <span className="font-medium">{formatTokenCount(total)}</span>
      </div>
      <div className="h-3 w-px bg-border" />
      <div className="flex items-center gap-1" title="Input tokens">
        <ArrowUp className="h-3 w-3 text-blue-500" />
        <span>{formatTokenCount(inputTokens)}</span>
      </div>
      <div className="flex items-center gap-1" title="Output tokens">
        <ArrowDown className="h-3 w-3 text-green-500" />
        <span>{formatTokenCount(outputTokens)}</span>
      </div>
    </div>
  );
}
