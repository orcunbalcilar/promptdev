'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  CodeBlock,
  CodeBlockHeader,
  CodeBlockTitle,
  CodeBlockFilename,
  CodeBlockActions,
  CodeBlockCopyButton,
} from '@/components/ai-elements/code-block'
import { cn } from '@/lib/utils'
import type { BundledLanguage } from 'shiki'
import {
  ChevronRight,
  FileCode2,
  FilePlus2,
  FileMinus2,
  FileEdit,
  Plus,
  Minus,
} from 'lucide-react'
import type { FileChangeInfo } from './types'
import { getFileName, inferLanguage } from './types'

// ---------------------------------------------------------------------------
// SectionHeader
// ---------------------------------------------------------------------------

export function SectionHeader({
  icon: Icon,
  title,
  count,
  defaultOpen = true,
  children,
}: Readonly<{
  icon: React.ComponentType<{ className?: string }>
  title: string
  count?: number
  defaultOpen?: boolean
  children: React.ReactNode
}>) {
  return (
    <Collapsible defaultOpen={defaultOpen}>
      <CollapsibleTrigger className="group flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold hover:bg-muted/50 transition-colors">
        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span>{title}</span>
        {count !== undefined && count > 0 && (
          <Badge variant="secondary" className="ml-auto text-[10px] font-mono">
            {count}
          </Badge>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3 pt-1">
        {children}
      </CollapsibleContent>
    </Collapsible>
  )
}

// ---------------------------------------------------------------------------
// DiffView
// ---------------------------------------------------------------------------

function getDiffLineClass(line: string): string {
  if (line.startsWith('+') && !line.startsWith('+++'))
    return 'text-green-400 bg-green-950/30'
  if (line.startsWith('-') && !line.startsWith('---'))
    return 'text-red-400 bg-red-950/30'
  if (line.startsWith('@@')) return 'text-blue-400'
  return 'text-zinc-400'
}

export function DiffView({ diff }: Readonly<{ diff: string }>) {
  const lines = diff.split('\n')
  return (
    <div className="rounded-md border bg-zinc-950 text-zinc-100 overflow-auto max-h-64 font-mono text-xs">
      <div className="p-3">
        {lines.map((line) => (
          <div
            key={`${line.slice(0, 40)}-${line.length}`}
            className={cn('px-1 whitespace-pre-wrap', getDiffLineClass(line))}
          >
            {line || ' '}
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// FileChangeBadge
// ---------------------------------------------------------------------------

export function FileChangeBadge({
  type,
}: Readonly<{ type: 'added' | 'modified' | 'deleted' }>) {
  const styles = {
    added:
      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    modified:
      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    deleted: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }
  const icons = {
    added: FilePlus2,
    modified: FileEdit,
    deleted: FileMinus2,
  }
  const Icon = icons[type]
  return (
    <Badge
      variant="secondary"
      className={cn('gap-1 text-[10px] capitalize', styles[type])}
    >
      <Icon className="h-3 w-3" />
      {type}
    </Badge>
  )
}

// ---------------------------------------------------------------------------
// FileChangeDetail
// ---------------------------------------------------------------------------

export function FileChangeDetail({
  file,
}: Readonly<{ file: FileChangeInfo }>) {
  const [expanded, setExpanded] = useState(false)
  const hasContent = file.codeSnippet || file.diff
  const lang =
    (file.language as BundledLanguage) || inferLanguage(file.filePath)

  return (
    <div className="border rounded-md">
      <button
        type="button"
        onClick={() => hasContent && setExpanded(!expanded)}
        className={cn(
          'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
          hasContent && 'hover:bg-muted/50 cursor-pointer',
          !hasContent && 'cursor-default',
        )}
      >
        {hasContent && (
          <ChevronRight
            className={cn(
              'h-3 w-3 text-muted-foreground transition-transform',
              expanded && 'rotate-90',
            )}
          />
        )}
        {!hasContent && <span className="w-3" />}
        <FileCode2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="font-mono text-xs truncate flex-1">
          {file.filePath}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {(file.additions !== undefined || file.deletions !== undefined) && (
            <span className="flex items-center gap-1.5 font-mono text-[10px]">
              {file.additions !== undefined && file.additions > 0 && (
                <span className="text-green-600 dark:text-green-400 flex items-center gap-0.5">
                  <Plus className="h-2.5 w-2.5" />
                  {file.additions}
                </span>
              )}
              {file.deletions !== undefined && file.deletions > 0 && (
                <span className="text-red-600 dark:text-red-400 flex items-center gap-0.5">
                  <Minus className="h-2.5 w-2.5" />
                  {file.deletions}
                </span>
              )}
            </span>
          )}
          <FileChangeBadge type={file.type} />
        </div>
      </button>
      {expanded && hasContent && (
        <div className="border-t">
          {file.diff && <DiffView diff={file.diff} />}
          {file.codeSnippet && !file.diff && (
            <CodeBlock code={file.codeSnippet} language={lang}>
              <CodeBlockHeader>
                <CodeBlockTitle>
                  <CodeBlockFilename>
                    {getFileName(file.filePath)}
                  </CodeBlockFilename>
                </CodeBlockTitle>
                <CodeBlockActions>
                  <CodeBlockCopyButton />
                </CodeBlockActions>
              </CodeBlockHeader>
            </CodeBlock>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// getFileTypeIcon (for file tree)
// ---------------------------------------------------------------------------

export function getFileTypeIcon(type: string) {
  if (type === 'added') return <FilePlus2 className="size-4 text-green-500" />
  if (type === 'deleted')
    return <FileMinus2 className="size-4 text-red-500" />
  return <FileEdit className="size-4 text-yellow-500" />
}
