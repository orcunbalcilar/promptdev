/**
 * Start command - Start all PromptDev services.
 */

import chalk from 'chalk'
import ora from 'ora'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { exec, execSafe, getProjectDir, isPortInUse, spawnDetached } from '../utils.js'

interface StartOptions {
  service?: string
  detach: boolean
  directory?: string
}

type ServiceName = 'db' | 'backend' | 'frontend'

async function startDatabase(): Promise<boolean> {
  const spinner = ora('Starting PostgreSQL...').start()

  if (isPortInUse(5432)) {
    spinner.succeed('PostgreSQL already running on port 5432')
    return true
  }

  // Try docker
  const hasDocker = execSafe('which docker') !== null
  if (hasDocker) {
    try {
      // Check if container exists
      const existing = execSafe('docker ps -a --filter name=promptdev-db --format "{{.ID}}"')
      if (existing) {
        exec('docker start promptdev-db')
      } else {
        exec('docker run -d --name promptdev-db -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=promptdev postgres:16')
      }
      spinner.succeed('PostgreSQL started via Docker')
      return true
    } catch {
      spinner.fail('Failed to start PostgreSQL via Docker')
      return false
    }
  }

  spinner.fail('PostgreSQL not running and Docker not available')
  console.log(chalk.yellow('  Please start PostgreSQL manually on port 5432'))
  return false
}

async function startBackend(projectDir: string, detach: boolean): Promise<boolean> {
  const spinner = ora('Starting backend...').start()
  const backendDir = join(projectDir, 'promptdev-backend')

  if (!existsSync(backendDir)) {
    spinner.fail('Backend directory not found')
    return false
  }

  if (isPortInUse(8080)) {
    spinner.succeed('Backend already running on port 8080')
    return true
  }

  const mvnCmd = process.platform === 'win32' ? 'mvnw.cmd' : './mvnw'

  if (detach) {
    const logFile = join(projectDir, '.promptdev', 'backend.log')
    spawnDetached(mvnCmd, ['spring-boot:run'], backendDir, logFile)
    spinner.succeed('Backend starting in background (port 8080)')
  } else {
    try {
      exec(`${mvnCmd} spring-boot:run -q &`, backendDir)
      spinner.succeed('Backend started on port 8080')
    } catch {
      spinner.fail('Failed to start backend')
      return false
    }
  }

  return true
}

async function startFrontend(projectDir: string, detach: boolean): Promise<boolean> {
  const spinner = ora('Starting frontend...').start()
  const frontendDir = join(projectDir, 'promptdev-frontend')

  if (!existsSync(frontendDir)) {
    spinner.fail('Frontend directory not found')
    return false
  }

  if (isPortInUse(3000)) {
    spinner.succeed('Frontend already running on port 3000')
    return true
  }

  if (detach) {
    const logFile = join(projectDir, '.promptdev', 'frontend.log')
    spawnDetached('npm', ['run', 'dev'], frontendDir, logFile)
    spinner.succeed('Frontend starting in background (port 3000)')
  } else {
    try {
      exec('npm run dev &', frontendDir)
      spinner.succeed('Frontend started on port 3000')
    } catch {
      spinner.fail('Failed to start frontend')
      return false
    }
  }

  return true
}

const SERVICE_STARTERS: Record<ServiceName, (dir: string, detach: boolean) => Promise<boolean>> = {
  db: () => startDatabase(),
  backend: startBackend,
  frontend: startFrontend,
}

export async function startCommand(options: StartOptions): Promise<void> {
  console.log(chalk.bold('\n⚡ Starting PromptDev\n'))

  const projectDir = getProjectDir(options.directory)

  if (options.service) {
    const svc = options.service as ServiceName
    if (!(svc in SERVICE_STARTERS)) {
      console.error(chalk.red(`Unknown service: ${svc}. Valid: db, backend, frontend`))
      process.exit(1)
    }
    await SERVICE_STARTERS[svc](projectDir, options.detach)
  } else {
    // Start all services in order
    await startDatabase()
    // Wait a bit for DB to be ready
    await new Promise(resolve => setTimeout(resolve, 2000))
    await startBackend(projectDir, options.detach)
    await startFrontend(projectDir, options.detach)
  }

  console.log(chalk.green('\n✅ Services started\n'))
  console.log(`  Backend:  ${chalk.cyan('http://localhost:8080')}`)
  console.log(`  Frontend: ${chalk.cyan('http://localhost:3000')}`)
  console.log()
}
