/**
 * Shared utilities for CLI commands.
 */

import { execSync, spawn, type ChildProcess } from 'node:child_process'
import { existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

// ── Config management ──────────────────────────────────────────────

const CONFIG_DIR = join(homedir(), '.promptdev')
const CONFIG_FILE = join(CONFIG_DIR, 'config.json')

export interface PromptDevConfig {
  projectDir: string
  frontendPort: number
  dbPort: number
  repoUrl: string
  branch: string
  autoUpdate: boolean
}

const DEFAULT_CONFIG: PromptDevConfig = {
  projectDir: join(homedir(), 'promptdev'),
  frontendPort: 3000,
  dbPort: 5432,
  repoUrl: '',
  branch: 'main',
  autoUpdate: true,
}

export function loadConfig(): PromptDevConfig {
  if (!existsSync(CONFIG_FILE)) return { ...DEFAULT_CONFIG }
  try {
    const raw = readFileSync(CONFIG_FILE, 'utf-8')
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

export function saveConfig(config: PromptDevConfig): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true })
  }
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
}

// ── Process helpers ────────────────────────────────────────────────

export function exec(command: string, cwd?: string): string {
  return execSync(command, {
    cwd,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim()
}

export function execSafe(command: string, cwd?: string): string | null {
  try {
    return exec(command, cwd)
  } catch {
    return null
  }
}

export function spawnDetached(
  command: string,
  args: string[],
  cwd: string,
  logFile?: string,
): ChildProcess {
  const out = logFile
    ? openSync(logFile, 'a')
    : 'ignore'
  const child = spawn(command, args, {
    cwd,
    detached: true,
    stdio: ['ignore', out, out],
  })
  child.unref()
  return child
}

// ── Checks ─────────────────────────────────────────────────────────

export function isPortInUse(port: number): boolean {
  try {
    exec(`lsof -i :${port} -t`)
    return true
  } catch {
    return false
  }
}

export function getPidOnPort(port: number): string | null {
  return execSafe(`lsof -t -i :${port}`)
}

export function isCommandAvailable(cmd: string): boolean {
  return execSafe(`which ${cmd}`) !== null
}

export function getProjectDir(optDir?: string): string {
  if (optDir) return optDir
  const config = loadConfig()
  if (config.projectDir && existsSync(config.projectDir)) return config.projectDir
  if (existsSync('./promptdev-frontend')) return process.cwd()
  return config.projectDir
}

// ── Version utilities ──────────────────────────────────────────────

export interface VersionInfo {
  cli: string
  frontend: string | null
  node: string | null
}

export function getVersionInfo(projectDir: string): VersionInfo {
  const cliVersion = '1.0.0'

  let frontendVersion: string | null = null
  const pkgPath = join(projectDir, 'promptdev-frontend', 'package.json')
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
      frontendVersion = pkg.version
    } catch { /* ignore */ }
  }

  const nodeVersion = execSafe('node --version')

  return {
    cli: cliVersion,
    frontend: frontendVersion,
    node: nodeVersion,
  }
}
