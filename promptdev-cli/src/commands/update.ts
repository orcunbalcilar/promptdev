/**
 * Update command - Pull latest changes and rebuild.
 */

import chalk from 'chalk'
import ora from 'ora'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { exec, getProjectDir, isPortInUse } from '../utils.js'

interface UpdateOptions {
  directory?: string
  restart: boolean
}

export async function updateCommand(options: UpdateOptions): Promise<void> {
  console.log(chalk.bold('\n🔄 Updating PromptDev\n'))

  const projectDir = getProjectDir(options.directory)

  // Git pull
  const pullSpinner = ora('Pulling latest changes...').start()
  try {
    const output = exec('git pull --rebase', projectDir)
    if (output.includes('Already up to date')) {
      pullSpinner.succeed('Already up to date')
    } else {
      pullSpinner.succeed('Changes pulled')
      console.log(chalk.dim(`  ${output.split('\n').slice(0, 3).join('\n  ')}`))
    }
  } catch (err) {
    pullSpinner.fail('Git pull failed')
    console.error(chalk.red('  You may have uncommitted changes. Stash or commit them first.'))
    throw err
  }

  // Rebuild backend
  const backendDir = join(projectDir, 'promptdev-backend')
  if (existsSync(backendDir)) {
    const backendSpinner = ora('Rebuilding backend...').start()
    try {
      const mvnCmd = process.platform === 'win32' ? 'mvnw.cmd' : './mvnw'
      exec(`${mvnCmd} clean install -DskipTests -q`, backendDir)
      backendSpinner.succeed('Backend rebuilt')
    } catch {
      backendSpinner.fail('Backend rebuild failed')
    }
  }

  // Rebuild frontend
  const frontendDir = join(projectDir, 'promptdev-frontend')
  if (existsSync(frontendDir)) {
    const frontendSpinner = ora('Updating frontend dependencies...').start()
    try {
      exec('pnpm install', frontendDir)
      frontendSpinner.succeed('Frontend dependencies updated')
    } catch {
      frontendSpinner.fail('Frontend dependency update failed')
    }

    const buildSpinner = ora('Rebuilding frontend...').start()
    try {
      exec('pnpm run build', frontendDir)
      buildSpinner.succeed('Frontend rebuilt')
    } catch {
      buildSpinner.fail('Frontend rebuild failed')
    }
  }

  // Restart services if requested and running
  if (options.restart) {
    const backendRunning = isPortInUse(8080)
    const frontendRunning = isPortInUse(3000)

    if (backendRunning || frontendRunning) {
      console.log(chalk.yellow('\n  Restart running services manually:'))
      console.log(chalk.dim('    promptdev stop && promptdev start'))
    }
  }

  console.log(chalk.green('\n✅ Update complete\n'))
}
