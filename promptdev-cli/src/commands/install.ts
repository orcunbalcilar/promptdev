/**
 * Install command - Clone and set up the PromptDev project.
 */

import chalk from 'chalk'
import ora from 'ora'
import { exec, execSafe, isCommandAvailable, loadConfig, saveConfig } from '../utils.js'

interface InstallOptions {
  directory: string
  repoUrl?: string
  branch: string
  skipDeps: boolean
}

export async function installCommand(options: InstallOptions): Promise<void> {
  console.log(chalk.bold('\n🚀 PromptDev Installation\n'))

  const config = loadConfig()
  const projectDir = options.directory

  // Prerequisite checks
  const spinner = ora('Checking prerequisites...').start()

  const checks = [
    { name: 'git', required: true },
    { name: 'java', required: true },
    { name: 'node', required: true },
    { name: 'npm', required: true },
    { name: 'docker', required: false },
  ]

  const missing: string[] = []
  for (const check of checks) {
    if (!isCommandAvailable(check.name)) {
      if (check.required) {
        missing.push(check.name)
      } else {
        spinner.warn(`Optional: ${check.name} not found`)
      }
    }
  }

  if (missing.length > 0) {
    spinner.fail(`Missing required tools: ${missing.join(', ')}`)
    console.log(chalk.yellow('\nPlease install the missing tools and try again.'))
    process.exit(1)
  }

  spinner.succeed('All prerequisites met')

  // Clone repository
  const repoUrl = options.repoUrl ?? config.repoUrl
  if (repoUrl) {
    const cloneSpinner = ora('Cloning repository...').start()
    try {
      exec(`git clone -b ${options.branch} ${repoUrl} ${projectDir}`)
      cloneSpinner.succeed('Repository cloned')
    } catch (err) {
      cloneSpinner.fail('Failed to clone repository')
      throw err
    }
  } else {
    console.log(chalk.dim('  No repo URL provided, assuming local project directory'))
  }

  // Install backend dependencies
  if (!options.skipDeps) {
    const backendSpinner = ora('Building backend (Maven)...').start()
    try {
      const mvnCmd = process.platform === 'win32' ? 'mvnw.cmd' : './mvnw'
      exec(`${mvnCmd} clean install -DskipTests -q`, `${projectDir}/promptdev-backend`)
      backendSpinner.succeed('Backend built successfully')
    } catch (err) {
      backendSpinner.fail('Backend build failed')
      console.error(chalk.red('  Run with -q removed for full output'))
      throw err
    }

    // Install frontend dependencies
    const frontendSpinner = ora('Installing frontend dependencies...').start()
    try {
      exec('npm install', `${projectDir}/promptdev-frontend`)
      frontendSpinner.succeed('Frontend dependencies installed')
    } catch (err) {
      frontendSpinner.fail('Frontend dependency installation failed')
      throw err
    }

    // Build frontend
    const buildSpinner = ora('Building frontend...').start()
    try {
      exec('npm run build', `${projectDir}/promptdev-frontend`)
      buildSpinner.succeed('Frontend built successfully')
    } catch (err) {
      buildSpinner.fail('Frontend build failed')
      throw err
    }
  }

  // Check for PostgreSQL
  const dbAvailable = isCommandAvailable('psql') || isCommandAvailable('docker')
  if (!dbAvailable) {
    console.log(chalk.yellow('\n⚠️  PostgreSQL not found. Install it or use Docker:'))
    console.log(chalk.dim('  docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=promptdev postgres'))
  }

  // Save config
  config.projectDir = projectDir
  if (repoUrl) config.repoUrl = repoUrl
  config.branch = options.branch
  saveConfig(config)

  // Summary
  console.log(chalk.green('\n✅ Installation complete!\n'))
  console.log(chalk.bold('Next steps:'))
  console.log(`  ${chalk.cyan('promptdev start')}      - Start all services`)
  console.log(`  ${chalk.cyan('promptdev status')}     - Check service status`)
  console.log(`  ${chalk.cyan('promptdev --help')}     - Show all commands`)
  console.log()

  // Java version info
  const javaVersion = execSafe('java --version 2>&1 | head -1')
  if (javaVersion) {
    console.log(chalk.dim(`  Java: ${javaVersion}`))
  }
  const nodeVersion = execSafe('node --version')
  if (nodeVersion) {
    console.log(chalk.dim(`  Node: ${nodeVersion}`))
  }
  console.log()
}
