import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import dotenv from 'dotenv'

export const REQUIRED_ENV_KEYS = [
  'ENCRYPTION_KEY',
  'AUTH_SECRET',
  'AUTH_GITHUB_ID',
  'AUTH_GITHUB_SECRET',
  'GITHUB_TOKEN',
] as const

export const SECRET_ENV_KEYS = new Set([
  'ENCRYPTION_KEY',
  'AUTH_SECRET',
  'AUTH_GITHUB_SECRET',
  'AUTH_GOOGLE_SECRET',
  'GITHUB_TOKEN',
  'BITBUCKET_TOKEN',
  'JIRA_TOKEN',
  'SLACK_BOT_TOKEN',
  'SLACK_APP_TOKEN',
  'SLACK_SIGNING_SECRET',
])

export function resolveEnvFilePath(projectDir: string, envFile?: string): string {
  if (envFile && envFile.trim().length > 0) {
    return isAbsolute(envFile) ? envFile : resolve(process.cwd(), envFile)
  }

  return join(projectDir, '.env')
}

export function loadEnvFile(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) {
    return {}
  }

  const contents = readFileSync(filePath)
  return dotenv.parse(contents)
}

export function applyEnvToProcess(envValues: Record<string, string>): void {
  dotenv.populate(process.env, envValues, { override: false })
}

export function getMissingEnvKeys(
  requiredKeys: readonly string[],
  envValues: Record<string, string>,
): string[] {
  return requiredKeys.filter(key => {
    const value = envValues[key]
    return value === undefined || value.trim().length === 0
  })
}

function formatEnvValue(value: string): string {
  if (/^[A-Za-z0-9_./:@-]+$/.test(value)) {
    return value
  }

  const escaped = value
    .replaceAll(String.raw`\\`, String.raw`\\\\`)
    .replaceAll('"', String.raw`\\"`)
  return `"${escaped}"`
}

export function upsertEnvFile(filePath: string, values: Record<string, string>): void {
  const dir = dirname(filePath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  const existing = existsSync(filePath) ? readFileSync(filePath, 'utf-8') : ''
  const lines = existing.length > 0 ? existing.split(/\r?\n/) : []
  const lineIndexByKey = new Map<string, number>()

  lines.forEach((line, index) => {
    const match = /^\s*([A-Z0-9_]+)\s*[:=]/.exec(line)
    if (match) {
      lineIndexByKey.set(match[1], index)
    }
  })

  for (const [key, value] of Object.entries(values)) {
    const formatted = `${key}=${formatEnvValue(value)}`
    const existingIndex = lineIndexByKey.get(key)
    if (existingIndex === undefined) {
      lines.push(formatted)
    } else {
      lines[existingIndex] = formatted
    }
  }

  const output = lines.join('\n').replace(/\n*$/, '\n')
  writeFileSync(filePath, output)
}
