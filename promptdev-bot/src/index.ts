/**
 * PromptDev Slack Bot - Entry point.
 *
 * Uses Socket Mode for secure, firewall-friendly communication.
 * Supports slash commands and interactive messages for remote task management.
 */

import { App, LogLevel } from '@slack/bolt'
import { registerCommands } from './commands.js'
import { registerActions } from './actions.js'

function getRequiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

const app = new App({
  token: getRequiredEnv('SLACK_BOT_TOKEN'),
  appToken: getRequiredEnv('SLACK_APP_TOKEN'),
  signingSecret: getRequiredEnv('SLACK_SIGNING_SECRET'),
  socketMode: true,
  logLevel: LogLevel.INFO,
})

// Register all slash commands
registerCommands(app)

// Register all interactive actions (button clicks, modals)
registerActions(app)

// Health check event
app.event('app_mention', async ({ event, say }) => {
  await say(`👋 Hey <@${event.user}>! I'm PromptDev Bot. Use \`/pd help\` to see available commands.`)
})

// Start the bot
const port = Number.parseInt(process.env.PORT ?? '3001', 10)
await app.start(port)
console.log(`⚡ PromptDev Bot is running (Socket Mode, port ${port})`)
