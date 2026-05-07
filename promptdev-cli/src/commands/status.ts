/**
 * Status command - Check the status of all services.
 */

import chalk from 'chalk'
import { getProjectDir, isPortInUse, execSafe, getVersionInfo } from '../utils.js'

interface StatusOptions {
  directory?: string
  json: boolean
}

interface ServiceStatus {
  name: string
  port: number
  running: boolean
  pid: string | null
  url: string
}

function checkService(name: string, port: number): ServiceStatus {
  const running = isPortInUse(port)
  const pid = running ? execSafe(`lsof -t -i :${port}`) : null
  return {
    name,
    port,
    running,
    pid: pid?.split('\n')[0] ?? null,
    url: `http://localhost:${port}`,
  }
}

export async function statusCommand(options: StatusOptions): Promise<void> {
  const projectDir = getProjectDir(options.directory)

  const services: ServiceStatus[] = [
    checkService('PostgreSQL', 5432),
    checkService('Frontend', 3000),
  ]

  if (options.json) {
    const versionInfo = getVersionInfo(projectDir)
    console.log(JSON.stringify({ services, versions: versionInfo }, null, 2))
    return
  }

  console.log(chalk.bold('\n📊 PromptDev Status\n'))

  const maxNameLen = Math.max(...services.map(s => s.name.length))

  for (const svc of services) {
    const indicator = svc.running
      ? chalk.green('●')
      : chalk.red('○')
    const statusText = svc.running
      ? chalk.green('running')
      : chalk.dim('stopped')
    const pidText = svc.pid ? chalk.dim(` (PID ${svc.pid})`) : ''
    const name = svc.name.padEnd(maxNameLen)

    console.log(`  ${indicator} ${name}  :${svc.port}  ${statusText}${pidText}`)
  }

  // Version info
  const versions = getVersionInfo(projectDir)
  console.log(chalk.bold('\n📦 Versions\n'))
  console.log(`  CLI:      ${chalk.cyan(versions.cli)}`)
  if (versions.frontend) console.log(`  Frontend: ${chalk.cyan(versions.frontend)}`)
  if (versions.node) console.log(`  Node:     ${chalk.dim(versions.node)}`)
  console.log()
}
