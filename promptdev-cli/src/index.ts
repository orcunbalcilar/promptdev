#!/usr/bin/env node

/**
 * PromptDev CLI - Project distribution and management tool.
 *
 * Commands:
 *   install   - Clone and set up the PromptDev project
 *   start     - Start all PromptDev services
 *   stop      - Stop all PromptDev services
 *   status    - Check the status of all services
 *   update    - Pull latest changes and rebuild
 *   version   - Show version information
 *   config    - Manage CLI configuration
 */

import { Command } from 'commander'
import chalk from 'chalk'
import { installCommand } from './commands/install.js'
import { startCommand } from './commands/start.js'
import { stopCommand } from './commands/stop.js'
import { statusCommand } from './commands/status.js'
import { updateCommand } from './commands/update.js'
import { configCommand } from './commands/config.js'

const program = new Command()

program
  .name('promptdev')
  .description('CLI tool for PromptDev project distribution and management')
  .version('1.0.0')

program
  .command('install')
  .description('Clone and set up the PromptDev project')
  .option('-d, --directory <path>', 'Installation directory', './promptdev')
  .option('--repo-url <url>', 'Git repository URL')
  .option('--branch <branch>', 'Git branch to checkout', 'main')
  .option('--skip-deps', 'Skip dependency installation', false)
  .action(installCommand)

program
  .command('start')
  .description('Start all PromptDev services')
  .option('-s, --service <service>', 'Start a specific service (backend, frontend, db)')
  .option('--detach', 'Run in background', false)
  .option('-d, --directory <path>', 'Project directory')
  .action(startCommand)

program
  .command('stop')
  .description('Stop all PromptDev services')
  .option('-s, --service <service>', 'Stop a specific service')
  .option('-d, --directory <path>', 'Project directory')
  .action(stopCommand)

program
  .command('status')
  .description('Check the status of all services')
  .option('-d, --directory <path>', 'Project directory')
  .option('--json', 'Output as JSON', false)
  .action(statusCommand)

program
  .command('update')
  .description('Pull latest changes and rebuild')
  .option('-d, --directory <path>', 'Project directory')
  .option('--no-restart', 'Skip restarting services after update')
  .action(updateCommand)

program
  .command('config')
  .description('Manage CLI configuration')
  .option('--show', 'Show current configuration')
  .option('--set <key=value>', 'Set a configuration value')
  .option('--reset', 'Reset configuration to defaults')
  .action(configCommand)

// Error handling
program.exitOverride()

try {
  await program.parseAsync(process.argv)
} catch (err) {
  if (err instanceof Error && 'exitCode' in err) {
    // Commander exit (--help, --version)
    process.exit(0)
  }
  console.error(chalk.red('Error:'), err instanceof Error ? err.message : err)
  process.exit(1)
}
