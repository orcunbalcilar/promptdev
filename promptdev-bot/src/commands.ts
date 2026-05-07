/**
 * Slash command handlers for the PromptDev Slack bot.
 *
 * Commands:
 *   /pd create <repo> <prompt>   - Create a new task
 *   /pd status <task-id>         - Check task status
 *   /pd list                     - List recent tasks
 *   /pd cancel <task-id>         - Cancel a task
 *   /pd start <task-id>          - Start a task
 *   /pd model [model-id]         - Get/set current model
 *   /pd review <repo> [branch]   - Review code changes
 *   /pd fleet                    - Show system fleet status
 *   /pd help                     - Show help
 */

import type { App, RespondFn } from "@slack/bolt";
import {
  cancelTask,
  createTask,
  getModels,
  getTask,
  getTasks,
  startTask,
  trackSlackOperation,
} from "./api.js";
import {
  formatFleetStatus,
  formatModelList,
  formatReviewStarted,
  formatTaskCreated,
  formatTaskList,
  formatTaskStatus,
} from "./messages.js";

// Per-channel model preference (in-memory, resets on restart)
const channelModels = new Map<string, string>();

export function registerCommands(app: App): void {
  app.command("/pd", async ({ command, ack, respond }) => {
    await ack();

    const args = command.text.trim().split(/\s+/);
    const subcommand = args[0]?.toLowerCase();

    try {
      switch (subcommand) {
        case "create": {
          await handleCreate(args.slice(1), respond);
          break;
        }
        case "status": {
          await handleStatus(args[1], respond);
          break;
        }
        case "list": {
          await handleList(respond);
          break;
        }
        case "cancel": {
          await handleCancel(args[1], respond);
          break;
        }
        case "start": {
          await handleStart(args[1], respond);
          break;
        }
        case "model": {
          await handleModel(args[1], command.channel_id, respond);
          break;
        }
        case "review": {
          await handleReview(args.slice(1), command.channel_id, respond);
          break;
        }
        case "fleet": {
          await handleFleet(respond);
          break;
        }
        case "help":
        default: {
          await handleHelp(respond);
          break;
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await respond({
        response_type: "ephemeral",
        text: `❌ Error: ${message}`,
      });
    }
  });
}

// Removed custom Respond type - using Bolt's RespondFn instead

async function handleCreate(args: string[], respond: RespondFn): Promise<void> {
  if (args.length < 2) {
    await respond({
      response_type: "ephemeral",
      text: "❌ Usage: `/pd create <repository-slug> <prompt>`\nExample: `/pd create my-app Add a login form to the homepage`",
    });
    return;
  }

  const repositorySlug = args[0];
  const prompt = args.slice(1).join(" ");
  const title = prompt.length > 60 ? prompt.slice(0, 57) + "..." : prompt;

  const task = await createTask({
    title,
    prompt,
    repositorySlug,
  });

  await startTask(task.id);

  await trackSlackOperation({
    operationType: "SLACK_TASK_CREATED",
    message: `Task created via Slack: ${title}`,
    details: JSON.stringify({ taskId: task.id, repositorySlug }),
  });

  await respond({
    response_type: "in_channel",
    ...formatTaskCreated(task),
  });
}

async function handleStatus(
  taskId: string | undefined,
  respond: RespondFn,
): Promise<void> {
  if (!taskId) {
    await respond({
      response_type: "ephemeral",
      text: "❌ Usage: `/pd status <task-id>`",
    });
    return;
  }

  const task = await getTask(taskId);
  await respond({
    response_type: "ephemeral",
    ...formatTaskStatus(task),
  });
}

async function handleList(respond: RespondFn): Promise<void> {
  const result = await getTasks(0, 10);
  await respond({
    response_type: "ephemeral",
    ...formatTaskList(result.content),
  });
}

async function handleCancel(
  taskId: string | undefined,
  respond: RespondFn,
): Promise<void> {
  if (!taskId) {
    await respond({
      response_type: "ephemeral",
      text: "❌ Usage: `/pd cancel <task-id>`",
    });
    return;
  }

  await cancelTask(taskId);
  await trackSlackOperation({
    operationType: "TASK_CANCELLED",
    message: `Task cancelled via Slack: ${taskId}`,
  });

  await respond({
    response_type: "ephemeral",
    text: `🚫 Task \`${taskId}\` has been cancelled.`,
  });
}

async function handleStart(
  taskId: string | undefined,
  respond: RespondFn,
): Promise<void> {
  if (!taskId) {
    await respond({
      response_type: "ephemeral",
      text: "❌ Usage: `/pd start <task-id>`",
    });
    return;
  }

  const task = await startTask(taskId);
  await trackSlackOperation({
    operationType: "TASK_STARTED",
    message: `Task started via Slack: ${taskId}`,
  });

  await respond({
    response_type: "in_channel",
    text: `⚡ Task *${task.title}* is now running! Track progress at the web UI.`,
  });
}

async function handleModel(
  modelId: string | undefined,
  channelId: string,
  respond: RespondFn,
): Promise<void> {
  const models = await getModels();

  if (!modelId) {
    // Show current model and list available models
    const currentModel =
      channelModels.get(channelId) ?? models[0]?.id ?? "default";
    await respond({
      response_type: "ephemeral",
      ...formatModelList(models, currentModel),
    });
    return;
  }

  // Set model for this channel
  const validModel = models.find((m: { id: string }) => m.id === modelId);
  if (!validModel) {
    const available = models
      .map((m: { id: string }) => `\`${m.id}\``)
      .join(", ");
    await respond({
      response_type: "ephemeral",
      text: `❌ Unknown model \`${modelId}\`. Available: ${available}`,
    });
    return;
  }

  channelModels.set(channelId, modelId);
  await trackSlackOperation({
    operationType: "MODEL_CHANGED",
    message: `Model changed to ${modelId} in channel ${channelId}`,
  });

  await respond({
    response_type: "ephemeral",
    text: `✅ Model set to *${validModel.name ?? modelId}* for this channel.`,
  });
}

async function handleReview(
  args: string[],
  channelId: string,
  respond: RespondFn,
): Promise<void> {
  if (args.length < 1) {
    await respond({
      response_type: "ephemeral",
      text: "❌ Usage: `/pd review <repository-slug> [branch]`\nExample: `/pd review my-app feature/login`",
    });
    return;
  }

  const repositorySlug = args[0];
  const branch = args[1] ?? "main";

  // Create a review task
  const task = await createTask({
    title: `Code review: ${repositorySlug}/${branch}`,
    prompt: `Review the code changes in the ${branch} branch of ${repositorySlug}. Focus on code quality, potential bugs, security issues, and best practices. Provide actionable feedback.`,
    repositorySlug,
  });

  await startTask(task.id);

  await trackSlackOperation({
    operationType: "CODE_REVIEW_STARTED",
    message: `Code review started via Slack: ${repositorySlug}/${branch}`,
    details: JSON.stringify({ taskId: task.id, branch }),
  });

  await respond({
    response_type: "in_channel",
    ...formatReviewStarted(task, repositorySlug, branch),
  });
}

async function handleFleet(respond: RespondFn): Promise<void> {
  const result = await getTasks(0, 50);
  const tasks = result.content;

  await respond({
    response_type: "ephemeral",
    ...formatFleetStatus(tasks),
  });
}

async function handleHelp(respond: RespondFn): Promise<void> {
  await respond({
    response_type: "ephemeral",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*PromptDev Bot Commands*",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: [
            "`/pd create <repo> <prompt>` — Create a new dev task",
            "`/pd start <task-id>` — Start a task",
            "`/pd status <task-id>` — Check task status",
            "`/pd list` — List recent tasks",
            "`/pd cancel <task-id>` — Cancel a running task",
            "`/pd model [model-id]` — View/set the AI model",
            "`/pd review <repo> [branch]` — Review code changes",
            "`/pd fleet` — Show fleet status overview",
            "`/pd help` — Show this help message",
          ].join("\n"),
        },
      },
    ],
  });
}
