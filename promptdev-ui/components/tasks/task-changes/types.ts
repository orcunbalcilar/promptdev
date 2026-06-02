import type { EventType } from '@/lib/api'
import type { BundledLanguage } from 'shiki'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FileChangeType = 'added' | 'modified' | 'deleted'

export interface FileChangeInfo {
  filePath: string
  type: FileChangeType
  additions?: number
  deletions?: number
  language?: string
  codeSnippet?: string
  diff?: string
}

export interface GitOperationInfo {
  eventType: EventType
  message: string
  details?: string
  timestamp: string
  commitHash?: string
  branch?: string
  files?: FileChangeInfo[]
}

export interface DependencyInfo {
  name: string
  version?: string
  changeType?: 'added' | 'removed' | 'major' | 'minor' | 'patch'
}

export interface CommandInfo {
  command: string
  output: string
  timestamp: string
}

export type TestStatus = 'passed' | 'failed' | 'skipped'

export interface TestInfo {
  name: string
  status: TestStatus
  duration?: number
  error?: string
  suite?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function inferLanguage(filePath: string): BundledLanguage {
  /* v8 ignore start -- pop() on non-empty array always returns string */
  const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
  /* v8 ignore stop */
  const map: Record<string, BundledLanguage> = {
    ts: 'typescript',
    tsx: 'tsx',
    js: 'javascript',
    jsx: 'jsx',
    py: 'python',
    java: 'java',
    kt: 'kotlin',
    rs: 'rust',
    go: 'go',
    rb: 'ruby',
    css: 'css',
    scss: 'scss',
    html: 'html',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    md: 'markdown',
    xml: 'xml',
    sql: 'sql',
    sh: 'bash',
    bash: 'bash',
    dockerfile: 'dockerfile',
    toml: 'toml',
  }
  return map[ext] ?? 'text'
}

export function parseJsonSafe<T>(str: string | undefined | null): T | null {
  if (!str) return null
  try {
    return JSON.parse(str) as T
  } catch {
    return null
  }
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  const mins = Math.floor(ms / 60_000)
  const secs = Math.round((ms % 60_000) / 1000)
  return `${mins}m ${secs}s`
}

export function getFileName(filePath: string): string {
  /* v8 ignore start -- pop() on non-empty array always returns string */
  return filePath.split('/').pop() ?? filePath
  /* v8 ignore stop */
}

export function fileStatusToType(status: string): FileChangeType {
  if (status === 'added') return 'added'
  if (status === 'deleted') return 'deleted'
  return 'modified'
}

export function buildFolderStructure(files: FileChangeInfo[]): Map<string, FileChangeInfo[]> {
  const folders = new Map<string, FileChangeInfo[]>()
  for (const f of files) {
    const parts = f.filePath.split('/')
    const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : '.'
    if (!folders.has(folder)) folders.set(folder, [])
    folders.get(folder)!.push(f)
  }
  return folders
}

export function getSuiteStatus(passed: number, failed: number, total: number): TestStatus {
  if (failed > 0) return 'failed'
  if (passed === total) return 'passed'
  return 'skipped'
}
