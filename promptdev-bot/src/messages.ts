/**
 * Slack message formatting helpers for PromptDev.
 */

interface TaskForMessage {
  id: string
  title: string
  status: string
  repositorySlug: string
  pullRequestUrl?: string
  errorMessage?: string
  createdAt: string
}

const STATUS_EMOJI: Record<string, string> = {
  PENDING: '🟡',
  QUEUED: '🔵',
  IN_PROGRESS: '⚙️',
  COMPLETED: '✅',
  FAILED: '❌',
  CANCELLED: '🚫',
}

export function formatTaskCreated(task: TaskForMessage) {
  return {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Task Created* ${STATUS_EMOJI[task.status] ?? '❓'}\n*${task.title}*`,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*ID:*\n\`${task.id}\`` },
          { type: 'mrkdwn', text: `*Repository:*\n${task.repositorySlug}` },
          { type: 'mrkdwn', text: `*Status:*\n${task.status}` },
        ],
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: '▶️ Start Task' },
            action_id: 'start_task',
            value: task.id,
            style: 'primary',
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: '❌ Cancel' },
            action_id: 'cancel_task',
            value: task.id,
            style: 'danger',
          },
        ],
      },
    ],
  }
}

export function formatTaskStatus(task: TaskForMessage) {
  const blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${STATUS_EMOJI[task.status] ?? '❓'} *${task.title}*`,
      },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Status:*\n${task.status}` },
        { type: 'mrkdwn', text: `*Repository:*\n${task.repositorySlug}` },
        { type: 'mrkdwn', text: `*Created:*\n<!date^${Math.floor(new Date(task.createdAt).getTime() / 1000)}^{date_short_pretty} {time}|${task.createdAt}>` },
      ],
    },
  ]

  if (task.pullRequestUrl) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Pull Request:* <${task.pullRequestUrl}|View PR>`,
      },
    })
  }

  if (task.errorMessage) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Error:*\n\`\`\`${task.errorMessage}\`\`\``,
      },
    })
  }

  return { blocks }
}

export function formatTaskList(tasks: TaskForMessage[]) {
  if (tasks.length === 0) {
    return {
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '_No tasks found._',
          },
        },
      ],
    }
  }

  const taskLines = tasks.map(
    (t) => `${STATUS_EMOJI[t.status] ?? '❓'} \`${t.id.slice(0, 8)}\` *${t.title}* — ${t.status}`,
  )

  return {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Recent Tasks (${tasks.length})*\n\n${taskLines.join('\n')}`,
        },
      },
    ],
  }
}

// ── New command formatters ─────────────────────────────────────────

interface ModelForMessage {
  id: string
  name: string
  description?: string
  multiplier?: string
  sampleMessage?: string
}

export function formatModelList(models: ModelForMessage[], currentModel: string) {
  if (models.length === 0) {
    return {
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '_No models available. Check Copilot configuration._',
          },
        },
      ],
    }
  }

  const modelLines = models.map((m) => {
    const isCurrent = m.id === currentModel ? ' ← *current*' : ''
    const mult = m.multiplier ? ` *[${m.multiplier}]*` : ''
    const desc = m.description ? ` — ${m.description}` : ''
    const sample = m.sampleMessage ? `\n\t> _"${m.sampleMessage}"_` : ''
    return `• \`${m.id}\` ${m.name}${mult}${desc}${isCurrent}${sample}`
  })

  return {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Available Models*\nCurrent: \`${currentModel}\`\n\n${modelLines.join('\n')}\n\n_Use \`/pd model <model-id>\` to switch._`,
        },
      },
    ],
  }
}

export function formatReviewStarted(
  task: TaskForMessage,
  repositorySlug: string,
  branch: string,
) {
  return {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `🔍 *Code Review Started*\n*Repository:* ${repositorySlug}\n*Branch:* ${branch}`,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Task ID:*\n\`${task.id}\`` },
          { type: 'mrkdwn', text: `*Status:*\n${STATUS_EMOJI[task.status] ?? '❓'} ${task.status}` },
        ],
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Use \`/pd status ${task.id.slice(0, 8)}\` to check review progress.`,
          },
        ],
      },
    ],
  }
}

export function formatFleetStatus(tasks: TaskForMessage[]) {
  const statusCounts: Record<string, number> = {}
  for (const task of tasks) {
    statusCounts[task.status] = (statusCounts[task.status] ?? 0) + 1
  }

  const statusLines = Object.entries(statusCounts).map(
    ([status, count]) => `${STATUS_EMOJI[status] ?? '❓'} *${status}*: ${count}`,
  )

  const activeTasks = tasks.filter((t) =>
    t.status === 'IN_PROGRESS' || t.status === 'QUEUED',
  )

  const activeLines = activeTasks.length > 0
    ? activeTasks.map(
        (t) => `${STATUS_EMOJI[t.status] ?? '❓'} \`${t.id.slice(0, 8)}\` *${t.title}*`,
      )
    : ['_No active tasks._']

  return {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*🚀 Fleet Status*\n\n${statusLines.join('  |  ')}\n*Total:* ${tasks.length} tasks`,
        },
      },
      {
        type: 'divider',
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Active Tasks*\n${activeLines.join('\n')}`,
        },
      },
    ],
  }
}
