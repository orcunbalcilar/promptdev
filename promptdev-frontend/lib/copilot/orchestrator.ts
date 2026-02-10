/**
 * Task Orchestrator
 *
 * Bridges the backend task system with the Copilot SDK.
 * When a task is started, the orchestrator:
 * 1. Creates a Copilot SDK session with proper configuration
 * 2. Sets up hooks to report ALL events to backend monitoring
 * 3. Sends the task prompt to the agent
 * 4. Manages workspace lifecycle (create → work → PR → cleanup)
 * 5. Handles iterative loops (Ralph Wiggum) with completion criteria
 * 6. Handles review with optional auto-fix
 * 7. Integrates with Jira (auto-transition, add PR comment)
 * 8. Supports session resume with new prompts
 */

import { createCopilotSession, sendMessage, subscribeToSession, destroySession, getSession } from './client'
import { COPILOT_MODELS } from './models'
import type { TypedCopilotEvent, BYOKProvider } from './types'
import { trackOperation, registerMonitoringSession, endMonitoringSession, flushOperations } from '../monitoring'

const BACKEND_API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'

// Active task sessions mapping: taskId -> sessionId
const taskSessions = new Map<string, string>()

// ── Types ───────────────────────────────────────────────────────

interface TaskData {
  id: string
  title: string
  prompt: string
  repositorySlug: string
  workspaceType: 'LOCAL' | 'BITBUCKET'
  workspacePath?: string
  sourceBranch: string
  targetBranch: string
  modelId?: string
  iterative?: boolean
  maxIterations?: number
  currentIteration?: number
  completionCriteria?: string
  steps?: string
  jiraIssueKey?: string
  reviewEnabled?: boolean
  reviewModelId?: string
  commitMessagePattern?: string
  bootScript?: string
  skills?: string
  additionalRepositories?: string
  resumePrompt?: string
  resumeCount?: number
  copilotSessionId?: string
  maxAttempts?: number
  currentAttempt?: number
}

interface ExecutionResult {
  success: boolean
  sessionId: string
  error?: string
}

// ── Backend Communication ───────────────────────────────────────

async function sendCallback(taskId: string, eventType: string, data: Record<string, unknown> = {}): Promise<void> {
  try {
    await fetch(`${BACKEND_API}/stream/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId,
        eventType,
        message: data.message ?? `Event: ${eventType}`,
        details: data.details ? JSON.stringify(data.details) : undefined,
        errorMessage: data.errorMessage,
        codeSnippet: data.codeSnippet,
        filePath: data.filePath,
        pullRequestId: data.pullRequestId,
        pullRequestUrl: data.pullRequestUrl,
      }),
    })
  } catch (err) {
    console.error(`[Orchestrator] Failed to send callback for task ${taskId}:`, err)
  }
}

async function fetchTask(taskId: string): Promise<TaskData> {
  const res = await fetch(`${BACKEND_API}/tasks/${taskId}`)
  if (!res.ok) throw new Error(`Failed to fetch task: ${res.statusText}`)
  return res.json()
}

async function createWorkspace(taskId: string): Promise<string> {
  const res = await fetch(`${BACKEND_API}/workspaces/${taskId}`, { method: 'POST' })
  if (!res.ok) {
    // If workspace endpoint doesn't exist yet, return temp path
    console.warn(`[Orchestrator] Workspace API not available, using temp path`)
    return `/tmp/promptdev-workspaces/${taskId}`
  }
  const data = await res.json()
  return data.path
}

async function cleanupWorkspace(taskId: string): Promise<void> {
  try {
    await fetch(`${BACKEND_API}/workspaces/${taskId}`, { method: 'DELETE' })
  } catch {
    console.warn(`[Orchestrator] Failed to cleanup workspace for task ${taskId}`)
  }
}

// ── Jira Integration ────────────────────────────────────────────

async function transitionJiraIssue(issueKey: string, targetStatus: string): Promise<void> {
  try {
    // Get available transitions
    const transRes = await fetch(`${BACKEND_API}/jira/issues/${issueKey}/transitions`)
    if (!transRes.ok) return
    const { transitions } = await transRes.json()

    // Find matching transition (case-insensitive)
    const transition = transitions?.find(
      (t: { name: string; id: string }) =>
        t.name.toLowerCase().includes(targetStatus.toLowerCase())
    )

    if (transition) {
      await fetch(`${BACKEND_API}/jira/issues/${issueKey}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transitionId: transition.id }),
      })
      console.log(`[Orchestrator] Jira ${issueKey} transitioned to ${targetStatus}`)
    }
  } catch (err) {
    console.warn(`[Orchestrator] Failed to transition Jira issue ${issueKey}:`, err)
  }
}

async function addJiraComment(issueKey: string, comment: string): Promise<void> {
  try {
    await fetch(`${BACKEND_API}/jira/issues/${issueKey}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment }),
    })
  } catch {
    console.warn(`[Orchestrator] Failed to add Jira comment to ${issueKey}`)
  }
}

// ── Skills Support ──────────────────────────────────────────────

function buildSkillsContext(skills: string): string {
  if (!skills) return ''

  const skillNames = skills.split(',').map(s => s.trim()).filter(Boolean)
  if (skillNames.length === 0) return ''

  const skillsXml = skillNames.map(name => {
    // Look for well-known skills and provide descriptions
    const knownSkills: Record<string, string> = {
      'playwright': 'Browser automation and E2E testing with Playwright',
      'react': 'React component development best practices',
      'nextjs': 'Next.js application development patterns',
      'typescript': 'TypeScript type-safe development',
      'java': 'Java and Spring Boot development',
      'python': 'Python development best practices',
      'database': 'Database design and query optimization',
      'security': 'Security audit and vulnerability detection',
      'docker': 'Docker containerization and deployment',
      'testing': 'Comprehensive testing strategies',
      'api': 'REST API design and implementation',
      'performance': 'Performance optimization techniques',
    }

    const description = knownSkills[name.toLowerCase()] || `Skill: ${name}`
    return `  <skill>\n    <name>${name}</name>\n    <description>${description}</description>\n  </skill>`
  }).join('\n')

  return `\n<available_skills>\n${skillsXml}\n</available_skills>`
}

// ── System Prompt Builder ───────────────────────────────────────

function buildSystemPrompt(task: TaskData): string {
  const parts: string[] = []

  // Base identity
  parts.push(`You are an expert AI software engineer working on a development task.
Your goal is to implement changes in the codebase, ensuring high code quality, proper testing, and clean architecture.`)

  // Task context
const sections = [
    `\n## Task Details
- Title: ${task.title}
- Repository: ${task.repositorySlug}
- Source Branch: ${task.sourceBranch}
- Target Branch: ${task.targetBranch}`,
  ]

    // Commit message pattern
    if (task.commitMessagePattern) {
      sections.push(`\n## Commit Message Pattern
Use this pattern for ALL commit messages: ${task.commitMessagePattern}
Replace {message} with a descriptive commit message.`)
    } else if (task.jiraIssueKey) {
      sections.push(`\n## Commit Message Pattern
Include the Jira key in ALL commit messages: [${task.jiraIssueKey}] <descriptive message>`)
    }

    // Boot script
    if (task.bootScript) {
      sections.push(`\n## Workspace Setup
Run these setup commands before starting work:
\`\`\`
${task.bootScript}
\`\`\``)
    }

    // Skills context
    if (task.skills) {
      sections.push(buildSkillsContext(task.skills))
    }

    // Review instructions
    if (task.reviewEnabled) {
      sections.push(`\n## Code Review
After completing your implementation:
1. Review all changes for code quality, security, and best practices
2. Run all tests to verify nothing is broken
3. Fix any issues found during review
4. Ensure proper error handling and edge cases are covered`)
    }

    // Iterative instructions
    if (task.iterative && task.completionCriteria) {
      sections.push(`\n## Completion Criteria
This is an iterative task. Continue working until these criteria are met:
${task.completionCriteria}

Report your progress after each iteration.`)
    }

    // Steps
    if (task.steps) {
      try {
        const steps = JSON.parse(task.steps) as string[]
        if (Array.isArray(steps) && steps.length > 0) {
          const stepList = steps.map((s, i) => `${i + 1}. ${s}`).join('\n')
          sections.push(`\n## Implementation Steps
Follow these steps in order:
${stepList}`)
        }
      } catch {
        // Steps is not valid JSON, use as-is
        sections.push(`\n## Implementation Steps\n${task.steps}`)
      }
    }

    // Quality guidelines
    sections.push(`\n## Quality Guidelines
- Follow existing code patterns and conventions in the repository
- Write clean, well-documented code
- Handle errors gracefully with meaningful messages
- Add comprehensive tests for all changes
- Follow SOLID principles and clean architecture
- Do NOT introduce security vulnerabilities
- Do NOT hardcode secrets or credentials`)

    parts.push(...sections)

  return parts.join('\n')
}

// ── Core Execution ──────────────────────────────────────────────

/**
 * Execute a task through the full SDLC pipeline.
 * This is the core orchestration function.
 */
export async function executeTask(
  taskId: string,
  userGithubToken?: string,
  byokProvider?: BYOKProvider,
): Promise<ExecutionResult> {
  console.log(`[Orchestrator] Starting task execution: ${taskId}`)

  try {
    // 1. Notify backend: task is being processed
    await sendCallback(taskId, 'AGENT_STARTED', { message: 'Copilot agent session starting' })

    // 2. Fetch full task data from backend
    const task = await fetchTask(taskId)

    // 3. Create workspace for the task
    let workspacePath: string | undefined
    try {
      workspacePath = await createWorkspace(taskId)
      await sendCallback(taskId, 'PROGRESS', {
        message: `Workspace created: ${workspacePath}`,
        details: { workspacePath },
      })
    } catch (err) {
      console.warn('[Orchestrator] Workspace creation failed, using default:', err)
    }

    // 4. Determine model
    const modelId = task.modelId || 'gpt-4.1'
    const modelInfo = COPILOT_MODELS.find(m => m.id === modelId)
    const supportsReasoning = modelInfo?.capabilities.reasoning ?? false

    // 5. Build system prompt
    const systemPrompt = buildSystemPrompt(task)

    // 6. Build prompt (initial or resume)
    const userPrompt = task.resumePrompt
      ? `Resume the previous session. Here is what needs to be done:\n\n${task.resumePrompt}\n\nPrevious task context:\n${task.prompt}`
      : task.prompt

    // 7. Create Copilot SDK session with full configuration
    const session = await createCopilotSession(
      {
        model: modelId,
        reasoningEffort: supportsReasoning ? 'high' : undefined,
        systemMessage: {
          content: systemPrompt,
          mode: 'append',
        },
        provider: byokProvider,
      },
      userGithubToken,
    )

    const sessionId = session.id
    taskSessions.set(taskId, sessionId)

    // 8. Register session in backend monitoring
    await registerMonitoringSession({
      sdkSessionId: sessionId,
      model: modelId,
      taskId,
      source: 'task-orchestrator',
    })

    // 9. Update task with session ID
    await sendCallback(taskId, 'PROGRESS', {
      message: `Copilot session created: ${sessionId}`,
      details: { sessionId, model: modelId },
    })

    // 10. Set up comprehensive event tracking
    setupEventTracking(taskId, sessionId, task)

    // 11. Jira integration: transition to "In Progress"
    if (task.jiraIssueKey) {
      await transitionJiraIssue(task.jiraIssueKey, 'In Progress')
      await addJiraComment(task.jiraIssueKey, `PromptDev AI agent started working on this issue.\nTask: ${task.title}\nSession: ${sessionId}`)
    }

    // 12. Send the prompt to the agent
    await sendCallback(taskId, 'PROGRESS', { message: 'Sending prompt to AI agent...' })
    await sendMessage(sessionId, userPrompt)

    // 13. Wait for completion (via event listener)
    // The event tracking will handle status updates and completion detection
    // For now, we return the session ID - the frontend polls for status via SSE

    return { success: true, sessionId }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during task execution'
    console.error(`[Orchestrator] Task ${taskId} failed:`, errorMessage)

    await sendCallback(taskId, 'TASK_FAILED', {
      message: `Task execution failed: ${errorMessage}`,
      errorMessage,
    })

    return { success: false, sessionId: '', error: errorMessage }
  }
}

/**
 * Set up comprehensive event tracking for a task session.
 * Reports all SDK events to backend monitoring and manages lifecycle.
 */
function setupEventTracking(taskId: string, sessionId: string, task: TaskData): () => void {
  let messageCount = 0
  let toolCount = 0
  let lastAssistantMessage = ''
  let isComplete = false

  const unsubscribe = subscribeToSession(sessionId, async (event: TypedCopilotEvent) => {
    try {
      switch (event.type) {
        case 'assistant.message': {
          const data = event.data as { content: string }
          messageCount++
          lastAssistantMessage = data.content

          await trackOperation({
            sessionId,
            taskId,
            operationType: 'MESSAGE_RECEIVED',
            message: data.content.slice(0, 500),
            source: 'task-orchestrator',
          })

          await sendCallback(taskId, 'PROGRESS', {
            message: `Agent response #${messageCount}`,
            details: { content: data.content.slice(0, 1000) },
          })
          break
        }

        case 'tool.execution_start': {
          const data = event.data as { toolName: string; toolId: string; input: Record<string, unknown> }
          toolCount++

          await trackOperation({
            sessionId,
            taskId,
            operationType: 'TOOL_EXECUTION_START',
            toolName: data.toolName,
            message: `Tool started: ${data.toolName}`,
            source: 'task-orchestrator',
          })

          // Track git operations specifically
          if (data.toolName.toLowerCase().includes('git') || data.toolName === 'Bash') {
            const input = JSON.stringify(data.input).toLowerCase()
            if (input.includes('git commit')) {
              await sendCallback(taskId, 'GIT_COMMIT', {
                message: `Git commit in progress`,
                details: data.input,
              })
            } else if (input.includes('git push')) {
              await sendCallback(taskId, 'GIT_PUSH', {
                message: `Git push in progress`,
                details: data.input,
              })
            }
          }
          break
        }

        case 'tool.execution_end': {
          const data = event.data as { toolId: string; toolName?: string; output?: unknown; error?: string; duration?: number }

          await trackOperation({
            sessionId,
            taskId,
            operationType: data.error ? 'TOOL_EXECUTION_ERROR' : 'TOOL_EXECUTION_END',
            toolName: data.toolName,
            durationMs: data.duration,
            success: !data.error,
            errorMessage: data.error,
            source: 'task-orchestrator',
          })

          if (data.error) {
            await sendCallback(taskId, 'ERROR', {
              message: `Tool error: ${data.error}`,
              errorMessage: data.error,
            })
          }
          break
        }

        case 'session.idle': {
          // Session is idle - might be completion
          if (!isComplete) {
            await handleSessionIdle(taskId, sessionId, task, lastAssistantMessage, messageCount, toolCount)
          }
          break
        }

        case 'error': {
          const data = event.data as { message: string }
          await trackOperation({
            sessionId,
            taskId,
            operationType: 'ERROR',
            message: data.message,
            success: false,
            errorMessage: data.message,
            source: 'task-orchestrator',
          })

          await sendCallback(taskId, 'TASK_FAILED', {
            message: `Session error: ${data.message}`,
            errorMessage: data.message,
          })

          isComplete = true
          await cleanupTaskSession(taskId, sessionId, task)
          break
        }
      }
    } catch (err) {
      console.error(`[Orchestrator] Error handling event for task ${taskId}:`, err)
    }
  })

  return unsubscribe
}

/**
 * Handle session idle - determine if task is complete or needs more work.
 */
async function handleSessionIdle(
  taskId: string,
  sessionId: string,
  task: TaskData,
  lastMessage: string,
  messageCount: number,
  toolCount: number,
): Promise<void> {
  console.log(`[Orchestrator] Session idle for task ${taskId} - messages: ${messageCount}, tools: ${toolCount}`)

  // If this is an iterative task, check completion
  if (task.iterative) {
    const currentIteration = (task.currentIteration ?? 0) + 1
    const maxIterations = task.maxIterations ?? 10

    if (currentIteration < maxIterations) {
      // Check if completion criteria is met
      const isComplete = await checkCompletionCriteria(task, lastMessage)

      if (!isComplete) {
        await sendCallback(taskId, 'ITERATION_COMPLETED', {
          message: `Iteration ${currentIteration}/${maxIterations} completed. Continuing...`,
          details: { currentIteration, maxIterations },
        })

        // Send next iteration prompt
        await sendMessage(sessionId, `Continue working on the task. This is iteration ${currentIteration + 1} of ${maxIterations}. Check your progress against the completion criteria and continue implementing.`)
        return
      }

      await sendCallback(taskId, 'ITERATION_COMPLETED', {
        message: `All iterations complete. Completion criteria met.`,
        details: { currentIteration, maxIterations },
      })
    }
  }

  // Mark as code generated
  await sendCallback(taskId, 'CODE_GENERATED', {
    message: 'AI agent completed code generation',
    details: { messageCount, toolCount },
  })

  // Handle review if enabled
  if (task.reviewEnabled) {
    await performReview(taskId, sessionId)
  }

  // Mark task as completed
  await sendCallback(taskId, 'TASK_COMPLETED', {
    message: `Task completed successfully. ${messageCount} messages, ${toolCount} tool calls.`,
  })

  // Jira integration: add completion comment
  if (task.jiraIssueKey) {
    await addJiraComment(task.jiraIssueKey, `PromptDev AI agent completed the task.\nTask: ${task.title}\nMessages: ${messageCount}, Tools: ${toolCount}`)
    await transitionJiraIssue(task.jiraIssueKey, 'Done')
  }

  // Cleanup
  await cleanupTaskSession(taskId, sessionId, task)
}

/**
 * Check if completion criteria is met based on the agent's last message.
 */
async function checkCompletionCriteria(task: TaskData, lastMessage: string): Promise<boolean> {
  if (!task.completionCriteria) return true

  // Simple heuristic: check if the agent mentions completion indicators
  const completionIndicators = [
    'all tests pass',
    'implementation complete',
    'criteria met',
    'task complete',
    'all requirements fulfilled',
    'done',
    'finished',
    'completed successfully',
  ]

  const lowerMessage = lastMessage.toLowerCase()
  return completionIndicators.some(indicator => lowerMessage.includes(indicator))
}

/**
 * Perform code review on the task's changes.
 */
async function performReview(
  taskId: string,
  sessionId: string,
): Promise<void> {
  await sendCallback(taskId, 'PROGRESS', {
    message: 'Starting code review...',
  })

  const reviewPrompt = `Review all the changes you just made. Check for:
1. Code quality and readability
2. Security vulnerabilities (SQL injection, XSS, etc.)
3. Error handling completeness
4. Test coverage
5. Performance issues
6. Documentation completeness

If you find issues, fix them now. Then provide a summary of the review.`

  await sendMessage(sessionId, reviewPrompt)

  await trackOperation({
    sessionId,
    taskId,
    operationType: 'MESSAGE_SENT',
    message: 'Review prompt sent',
    source: 'task-orchestrator',
  })
}

/**
 * Cleanup after task completion or failure.
 */
async function cleanupTaskSession(
  taskId: string,
  sessionId: string,
  task: TaskData,
): Promise<void> {
  try {
    // End monitoring session
    await endMonitoringSession(sessionId)
    await flushOperations()

    // Destroy Copilot session
    await destroySession(sessionId)

    // Remove from active sessions
    taskSessions.delete(taskId)

    // Cleanup workspace (only for non-local workspaces)
    if (task.workspaceType !== 'LOCAL') {
      await cleanupWorkspace(taskId)
    }

    console.log(`[Orchestrator] Cleaned up task session: ${taskId}`)
  } catch (err) {
    console.error(`[Orchestrator] Cleanup error for task ${taskId}:`, err)
  }
}

/**
 * Cancel a running task session.
 */
export async function cancelTaskSession(taskId: string): Promise<void> {
  const sessionId = taskSessions.get(taskId)
  if (!sessionId) {
    console.warn(`[Orchestrator] No active session for task ${taskId}`)
    return
  }

  const session = getSession(sessionId)
  if (session) {
    await destroySession(sessionId)
  }

  taskSessions.delete(taskId)
  await endMonitoringSession(sessionId)
  console.log(`[Orchestrator] Cancelled task session: ${taskId}`)
}

/**
 * Get the active session ID for a task.
 */
export function getTaskSessionId(taskId: string): string | undefined {
  return taskSessions.get(taskId)
}

/**
 * Check if a task has an active session.
 */
export function isTaskRunning(taskId: string): boolean {
  return taskSessions.has(taskId)
}
