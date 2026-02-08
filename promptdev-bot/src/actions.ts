/**
 * Interactive action handlers for Slack bot.
 * Handles button clicks from task messages.
 */

import type { App } from '@slack/bolt'
import { startTask, cancelTask, getTask, trackSlackOperation } from './api.js'
import { formatTaskStatus } from './messages.js'

export function registerActions(app: App): void {
  // Start task button
  app.action('start_task', async ({ action, ack, respond }) => {
    await ack()

    if (action.type !== 'button' || !action.value) return

    const taskId = action.value
    try {
      await startTask(taskId)
      await trackSlackOperation({
        operationType: 'TASK_STARTED',
        message: `Task started via Slack button: ${taskId}`,
      })

      const task = await getTask(taskId)
      await respond({
        replace_original: true,
        ...formatTaskStatus(task),
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      await respond({
        response_type: 'ephemeral',
        text: `❌ Failed to start task: ${message}`,
      })
    }
  })

  // Cancel task button
  app.action('cancel_task', async ({ action, ack, respond }) => {
    await ack()

    if (action.type !== 'button' || !action.value) return

    const taskId = action.value
    try {
      await cancelTask(taskId)
      await trackSlackOperation({
        operationType: 'TASK_CANCELLED',
        message: `Task cancelled via Slack button: ${taskId}`,
      })

      const task = await getTask(taskId)
      await respond({
        replace_original: true,
        ...formatTaskStatus(task),
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      await respond({
        response_type: 'ephemeral',
        text: `❌ Failed to cancel task: ${message}`,
      })
    }
  })
}
