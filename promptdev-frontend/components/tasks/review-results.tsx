"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  CodeBlockContainer,
  CodeBlockHeader,
  CodeBlockTitle,
  CodeBlockContent,
} from "@/components/ai-elements/code-block"
import {
  AlertTriangle,
  Info,
  XCircle,
  FileCode,
  Clock,
  Bot,
  ChevronDown,
  CheckCircle2,
} from "lucide-react"

// ============================================================================
// Types
// ============================================================================

export interface ReviewResult {
  severity: "info" | "warning" | "error"
  filePath: string
  line?: number
  description: string
  suggestion?: string
  codeSnippet?: string
}

export interface ReviewResultsProps {
  results: ReviewResult[]
  reviewModel?: string
  duration?: number
}

// ============================================================================
// Helpers
// ============================================================================

/* v8 ignore start — inferLanguage lookup map branches */
function inferLanguage(filePath: string): string {
  if (!filePath) return "text"
  const ext = filePath.split(".").pop()?.toLowerCase()
  const langMap: Record<string, string> = {
    ts: "typescript",
    tsx: "tsx",
    js: "javascript",
    jsx: "jsx",
    json: "json",
    css: "css",
    html: "html",
    py: "python",
    java: "java",
    kt: "kotlin",
    go: "go",
    rs: "rust",
    rb: "ruby",
    sql: "sql",
    sh: "bash",
    yml: "yaml",
    yaml: "yaml",
    md: "markdown",
    xml: "xml",
  }
  return langMap[ext ?? ""] ?? "text"
}
/* v8 ignore stop */

const SEVERITY_CONFIG = {
  error: {
    icon: XCircle,
    badgeClass: "bg-red-100 text-red-700 border-red-200 hover:bg-red-200",
    borderClass: "border-red-200",
    bgClass: "bg-red-50/50",
    iconClass: "text-red-600",
    label: "Error",
  },
  warning: {
    icon: AlertTriangle,
    badgeClass:
      "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200",
    borderClass: "border-amber-200",
    bgClass: "bg-amber-50/50",
    iconClass: "text-amber-600",
    label: "Warning",
  },
  info: {
    icon: Info,
    badgeClass: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200",
    borderClass: "border-blue-200",
    bgClass: "bg-blue-50/50",
    iconClass: "text-blue-600",
    label: "Info",
  },
} as const

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  const secs = Math.floor(ms / 1000)
  if (secs < 60) return `${secs}s`
  const mins = Math.floor(secs / 60)
  const remainSecs = secs % 60
  return `${mins}m ${remainSecs}s`
}

// ============================================================================
// Sub-components
// ============================================================================

function ReviewSummaryBadge({
  results,
}: Readonly<{ results: ReviewResult[] }>) {
  const counts = useMemo(() => {
    const c = { error: 0, warning: 0, info: 0 }
    for (const r of results) {
      c[r.severity]++
    }
    return c
  }, [results])

  const total = results.length

  if (total === 0) {
    return (
      <Badge
        variant="outline"
        className="bg-green-100 text-green-700 border-green-200"
      >
        <CheckCircle2 className="size-3 mr-1" />
        No issues found
      </Badge>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <Badge variant="outline" className="text-xs">
        {total === 1 ? "1 issue" : `${total} issues`} found
      </Badge>
      {counts.error > 0 && (
        <Badge
          variant="outline"
          className="bg-red-100 text-red-700 border-red-200 text-xs"
        >
          <XCircle className="size-3 mr-1" />
          {counts.error}
        </Badge>
      )}
      {counts.warning > 0 && (
        <Badge
          variant="outline"
          className="bg-amber-100 text-amber-700 border-amber-200 text-xs"
        >
          <AlertTriangle className="size-3 mr-1" />
          {counts.warning}
        </Badge>
      )}
      {counts.info > 0 && (
        <Badge
          variant="outline"
          className="bg-blue-100 text-blue-700 border-blue-200 text-xs"
        >
          <Info className="size-3 mr-1" />
          {counts.info}
        </Badge>
      )}
    </div>
  )
}

function ReviewFinding({
  result,
}: Readonly<{ result: ReviewResult }>) {
  const config = SEVERITY_CONFIG[result.severity]
  const SeverityIcon = config.icon
  const lang = inferLanguage(result.filePath) as Parameters<
    typeof CodeBlockContent
  >[0]["language"]

  return (
    <div
      className={cn(
        "rounded-lg border p-3 space-y-2 transition-colors",
        config.borderClass,
        config.bgClass,
      )}
    >
      {/* Header row */}
      <div className="flex items-start gap-2">
        <SeverityIcon
          className={cn("size-4 mt-0.5 shrink-0", config.iconClass)}
        />
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={cn("text-[10px]", config.badgeClass)}>
              {config.label}
            </Badge>
            <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
              <FileCode className="size-3" />
              {result.filePath}
              {result.line != null && (
                <span className="text-muted-foreground/60">:{result.line}</span>
              )}
            </span>
          </div>
          <p className="text-sm">{result.description}</p>
        </div>
      </div>

      {/* Suggestion */}
      {result.suggestion && (
        <div className="ml-6 text-xs text-muted-foreground bg-background/50 rounded p-2 border">
          <span className="font-medium text-foreground/70">Suggestion: </span>
          {result.suggestion}
        </div>
      )}

      {/* Code snippet */}
      {result.codeSnippet && (
        <div className="ml-6">
          <CodeBlockContainer language={lang}>
            <CodeBlockHeader>
              <CodeBlockTitle>
                <FileCode className="size-3 text-muted-foreground" />
                <span className="font-mono text-[10px]">
                  {result.filePath}
                  {result.line != null && `:${result.line}`}
                </span>
              </CodeBlockTitle>
            </CodeBlockHeader>
            <CodeBlockContent code={result.codeSnippet} language={lang} />
          </CodeBlockContainer>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function ReviewResults({
  results,
  reviewModel,
  duration,
}: Readonly<ReviewResultsProps>) {
  // Sort: errors first, then warnings, then info
  const sortedResults = useMemo(() => {
    const order: Record<string, number> = { error: 0, warning: 1, info: 2 }
    /* v8 ignore start — severity sort with unknown fallback */
    return [...results].sort(
      (a, b) => (order[a.severity] ?? 3) - (order[b.severity] ?? 3),
    )
    /* v8 ignore stop */
  }, [results])

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <ChevronDown className="size-4 text-muted-foreground" />
            Code Review Results
          </CardTitle>
          <ReviewSummaryBadge results={results} />
        </div>
        {/* Meta info */}
        <div className="flex items-center gap-3 mt-1">
          {reviewModel && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Bot className="size-3" />
              {reviewModel}
            </span>
          )}
          {duration != null && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="size-3" />
              {formatDuration(duration)}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {sortedResults.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-green-600 py-4 justify-center">
            <CheckCircle2 className="size-5" />
            <span className="font-medium">
              All checks passed — no issues found.
            </span>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedResults.map((result, index) => (
              <ReviewFinding key={`${result.filePath}-${result.line ?? 0}-${index}`} result={result} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Helper to parse review results from event details JSON
// ============================================================================

export function parseReviewResults(details?: string): ReviewResult[] {
  if (!details) return []
  try {
    const parsed = JSON.parse(details) as unknown
    if (Array.isArray(parsed)) return parsed as ReviewResult[]
    /* v8 ignore start — object type check + alternative JSON shapes */
    if (typeof parsed === "object" && parsed !== null) {
      const obj = parsed as Record<string, unknown>
      if (Array.isArray(obj.findings)) return obj.findings as ReviewResult[]
      if (Array.isArray(obj.results)) return obj.results as ReviewResult[]
      if (Array.isArray(obj.issues)) return obj.issues as ReviewResult[]
    }
    /* v8 ignore stop */
  } catch {
    // Not JSON - return a single info result with the raw text
    return [
      {
        severity: "info",
        filePath: "review",
        description: details,
      },
    ]
  }
  return []
}
