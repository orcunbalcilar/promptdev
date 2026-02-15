package com.promptdev.service;

import com.promptdev.config.BitbucketConfig;
import com.promptdev.dto.AgentCallbackRequest;
import com.promptdev.dto.CreatePullRequestTaskRequest;
import com.promptdev.dto.CreateTaskRequest;
import com.promptdev.dto.TaskEventResponse;
import com.promptdev.dto.TaskResponse;
import com.promptdev.dto.bitbucket.PullRequestResponse;
import com.promptdev.entity.*;
import com.promptdev.mapper.TaskMapper;
import com.promptdev.repository.TaskEventRepository;
import com.promptdev.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

/**
 * Service for managing development tasks.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TaskService {
    private static final String TASK_NOT_FOUND_MSG = "Task not found: ";

    private final TaskRepository taskRepository;
    private final TaskEventRepository taskEventRepository;
    private final TaskMapper taskMapper;
    private final SseService sseService;
    private final BitbucketService bitbucketService;
    private final BitbucketConfig bitbucketConfig;

    @Transactional
    public TaskResponse createTask(CreateTaskRequest request) {
        log.info("Creating new task: {}", request.getTitle());

        Task task = Task.builder()
                .title(request.getTitle())
                .prompt(request.getPrompt())
                .repositorySlug(request.getRepositorySlug())
                .projectKey(request.getProjectKey() != null ? request.getProjectKey() : bitbucketConfig.getProjectKey())
                .workspaceType(request.getWorkspaceType() != null ? request.getWorkspaceType() : com.promptdev.entity.WorkspaceType.BITBUCKET)
                .workspacePath(request.getWorkspacePath())
                .sourceBranch(request.getSourceBranch() != null ? request.getSourceBranch() : "main")
                .targetBranch(request.getTargetBranch())
                .modelId(request.getModelId() != null ? request.getModelId() : "gpt-5.2")
                .status(TaskStatus.PENDING)
                .maxAttempts(request.getMaxAttempts() != null ? request.getMaxAttempts() : 3)
                .iterative(Boolean.TRUE.equals(request.getIterative()))
                .maxIterations(request.getMaxIterations() != null ? request.getMaxIterations() : 10)
                .completionCriteria(request.getCompletionCriteria())
                .steps(request.getSteps())
                .jiraIssueKey(request.getJiraIssueKey())
                .reviewEnabled(request.getReviewEnabled() == null || request.getReviewEnabled())
                .reviewModelId(request.getReviewModelId())
                .commitMessagePattern(request.getCommitMessagePattern())
                .bootScript(request.getBootScript())
                .skills(request.getSkills())
                .additionalRepositories(request.getAdditionalRepositories())
                .build();

        task = taskRepository.save(task);

        // Handle auto-generated branch name
        if ("__AUTO_GENERATED__".equals(request.getSourceBranch())) {
            String newBranchName = "promptdev/" + task.getId();
            String projectKey = task.getProjectKey();
            String repoSlug = task.getRepositorySlug();
            // Default to main if target branch is not specified
            String startPoint = request.getTargetBranch() != null ? request.getTargetBranch() : "main";

            try {
                log.info("Auto-creating branch '{}' from '{}' for task {}", newBranchName, startPoint, task.getId());
                bitbucketService.createBranch(projectKey, repoSlug, newBranchName, startPoint);
            } catch (Exception e) {
                // Log but continue - if branch creation fails here (e.g. already exists), 
                // we still want to set the name and let the agent try to use it.
                log.warn("Failed to auto-create branch '{}': {}", newBranchName, e.getMessage());
            }

            task.setSourceBranch(newBranchName);
            task = taskRepository.save(task);
        }

        // Create initial event
        TaskEvent event = TaskEvent.builder()
                .task(task)
                .eventType(EventType.TASK_CREATED)
                .message("Task created successfully")
                .build();
        taskEventRepository.save(event);

        TaskResponse response = taskMapper.toResponse(task);

        // Notify SSE subscribers
        sseService.broadcastTaskUpdate(response);

        log.info("Task created with ID: {}", task.getId());
        return response;
    }

    @Transactional(readOnly = true)
    public TaskResponse getTask(UUID taskId) {
        Task task = taskRepository.findById(taskId)
            .orElseThrow(() -> new IllegalArgumentException(TASK_NOT_FOUND_MSG + taskId));
        return taskMapper.toResponse(task);
    }

    @Transactional(readOnly = true)
    public Page<TaskResponse> getAllTasks(Pageable pageable) {
        return taskRepository.findAllByOrderByCreatedAtDesc(pageable)
                .map(taskMapper::toResponseWithoutEvents);
    }

    @Transactional(readOnly = true)
    public List<TaskEventResponse> getTaskEvents(UUID taskId) {
        List<TaskEvent> events = taskEventRepository.findByTaskIdOrderByTimestampAsc(taskId);
        return taskMapper.toEventResponses(events);
    }

    @Transactional(readOnly = true)
    public List<TaskEventResponse> getTaskEventsSince(UUID taskId, LocalDateTime since) {
        List<TaskEvent> events = taskEventRepository.findByTaskIdAndTimestampAfter(taskId, since);
        return taskMapper.toEventResponses(events);
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> getTasksByScheduledJobId(UUID scheduledJobId) {
        return taskRepository.findByScheduledJobIdOrderByCreatedAtDesc(scheduledJobId)
                .stream()
                .map(taskMapper::toResponseWithoutEvents)
                .toList();
    }

    @Transactional
    public TaskResponse processAgentCallback(AgentCallbackRequest callback) {
        log.info("Processing callback for task {}: {}", callback.getTaskId(), callback.getEventType());

        Task task = taskRepository.findById(callback.getTaskId())
            .orElseThrow(() -> new IllegalArgumentException(TASK_NOT_FOUND_MSG + callback.getTaskId()));

        // Create event
        TaskEvent event = TaskEvent.builder()
                .task(task)
                .eventType(callback.getEventType())
                .message(callback.getMessage())
                .details(callback.getDetails())
                .codeSnippet(callback.getCodeSnippet())
                .filePath(callback.getFilePath())
                .toolName(callback.getToolName())
                .toolInput(callback.getToolInput())
                .toolOutput(callback.getToolOutput())
                .fileChanges(callback.getFileChanges())
                .build();
        taskEventRepository.save(event);

        // Update task based on event type
        updateTaskFromCallback(task, callback);

        // Update copilotSessionId if provided
        if (callback.getCopilotSessionId() != null && task.getCopilotSessionId() == null) {
            task.setCopilotSessionId(callback.getCopilotSessionId());
        }

        task = taskRepository.save(task);

        TaskResponse response = taskMapper.toResponse(task);

        // Notify SSE subscribers
        sseService.sendTaskEvent(task.getId(), taskMapper.toEventResponse(event));
        sseService.broadcastTaskUpdate(response);

        return response;
    }

    private static final java.util.Set<TaskStatus> TERMINAL_STATUSES =
            java.util.Set.of(TaskStatus.FAILED, TaskStatus.CANCELLED, TaskStatus.COMPLETED);

    private void updateTaskFromCallback(Task task, AgentCallbackRequest callback) {
        switch (callback.getEventType()) {
            case TASK_QUEUED -> task.setStatus(TaskStatus.QUEUED);
            case AGENT_STARTED -> {
                // Ralph Wiggum loop guard: prevent runaway agent starts
                if (task.getCurrentAttempt() >= task.getMaxAttempts()) {
                    log.warn("Task {} exceeded max attempts ({}/{}), marking FAILED",
                            task.getId(), task.getCurrentAttempt(), task.getMaxAttempts());
                    task.setStatus(TaskStatus.FAILED);
                    task.setErrorMessage("Maximum attempts exceeded (" + task.getMaxAttempts() + ")");
                    return;
                }
                task.setStatus(TaskStatus.IN_PROGRESS);
                task.setCurrentAttempt(task.getCurrentAttempt() + 1);
            }
            case CODE_GENERATED -> {
                // Don't regress from terminal status
                if (!TERMINAL_STATUSES.contains(task.getStatus())) {
                    task.setStatus(TaskStatus.CODE_GENERATED);
                }
            }
            case REVIEWING_STARTED -> {
                // Don't regress from terminal status (race: error may arrive before this)
                if (!TERMINAL_STATUSES.contains(task.getStatus())) {
                    task.setStatus(TaskStatus.REVIEWING);
                    log.info("Task {} entering code review", task.getId());
                } else {
                    log.warn("Task {} ignoring REVIEWING_STARTED; already in terminal status {}",
                            task.getId(), task.getStatus());
                }
            }
            case REVIEWING_COMPLETED -> {
                // Review passed, continue to commit step
                if (!TERMINAL_STATUSES.contains(task.getStatus())) {
                    task.setStatus(TaskStatus.COMMITTING);
                    log.info("Task {} code review completed, proceeding to commit", task.getId());
                }
            }
            case REVIEWING_FAILED -> {
                task.setStatus(TaskStatus.FAILED);
                task.setErrorMessage("Code review failed: " + callback.getMessage());
                log.warn("Task {} code review failed: {}", task.getId(), callback.getMessage());
            }
            case TRIAGING_STARTED -> {
                task.setStatus(TaskStatus.TRIAGING);
                log.info("Task {} entering triage", task.getId());
            }
            case TRIAGING_COMPLETED -> {
                task.setStatus(TaskStatus.IN_PROGRESS);
                log.info("Task {} triage completed, moving to in-progress", task.getId());
            }
            case GIT_COMMIT -> task.setStatus(TaskStatus.COMMITTING);
            case GIT_PUSH -> task.setStatus(TaskStatus.PUSHING);
            case PR_CREATED -> {
                task.setStatus(TaskStatus.CREATING_PR);
                if (callback.getPullRequestId() != null) {
                    task.setPullRequestId(callback.getPullRequestId());
                }
                if (callback.getPullRequestUrl() != null) {
                    task.setPullRequestUrl(callback.getPullRequestUrl());
                }
            }
            case TASK_COMPLETED -> {
                task.setStatus(TaskStatus.COMPLETED);
                task.setCompletedAt(LocalDateTime.now());
            }
            case TASK_FAILED -> {
                task.setStatus(TaskStatus.FAILED);
                task.setErrorMessage(callback.getErrorMessage());
            }
            case RETRY_SCHEDULED -> task.setStatus(TaskStatus.PENDING);
            default -> {
                // Other events don't change task status
            }
        }
    }

    @Transactional
    public TaskResponse cancelTask(UUID taskId) {
        Task task = taskRepository.findById(taskId)
            .orElseThrow(() -> new IllegalArgumentException(TASK_NOT_FOUND_MSG + taskId));

        if (task.getStatus() == TaskStatus.COMPLETED || task.getStatus() == TaskStatus.CANCELLED) {
            throw new IllegalStateException("Cannot cancel task in status: " + task.getStatus());
        }

        task.setStatus(TaskStatus.CANCELLED);

        TaskEvent event = TaskEvent.builder()
                .task(task)
                .eventType(EventType.ERROR)
                .message("Task cancelled by user")
                .build();
        taskEventRepository.save(event);

        task = taskRepository.save(task);
        TaskResponse response = taskMapper.toResponse(task);

        sseService.broadcastTaskUpdate(response);

        return response;
    }

    @Transactional
    public TaskResponse retryTask(UUID taskId) {
        Task task = taskRepository.findById(taskId)
            .orElseThrow(() -> new IllegalArgumentException(TASK_NOT_FOUND_MSG + taskId));

        if (task.getStatus() != TaskStatus.FAILED) {
            throw new IllegalStateException("Can only retry failed tasks");
        }

        // Ralph Wiggum loop guard: prevent infinite retry loops
        if (task.getCurrentAttempt() >= task.getMaxAttempts()) {
            throw new IllegalStateException(
                    "Maximum retry attempts reached (" + task.getCurrentAttempt()
                    + "/" + task.getMaxAttempts() + "). Increase maxAttempts to retry.");
        }

        task.setStatus(TaskStatus.PENDING);
        task.setErrorMessage(null);

        TaskEvent event = TaskEvent.builder()
                .task(task)
                .eventType(EventType.RETRY_SCHEDULED)
                .message("Task retry scheduled")
                .build();
        taskEventRepository.save(event);

        task = taskRepository.save(task);
        TaskResponse response = taskMapper.toResponse(task);

        sseService.broadcastTaskUpdate(response);

        return response;
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> getPendingTasks() {
        List<Task> tasks = taskRepository.findByStatusIn(List.of(TaskStatus.PENDING, TaskStatus.QUEUED));
        return tasks.stream()
                .map(taskMapper::toResponseWithoutEvents)
                .toList();
    }

    /**
     * Start processing a task (called when Copilot SDK picks it up).
     */
    @Transactional
    public TaskResponse startTask(UUID taskId) {
        Task task = taskRepository.findById(taskId)
            .orElseThrow(() -> new IllegalArgumentException(TASK_NOT_FOUND_MSG + taskId));

        if (task.getStatus() != TaskStatus.PENDING && task.getStatus() != TaskStatus.QUEUED) {
            throw new IllegalStateException("Task must be in PENDING or QUEUED status to start");
        }

        task.setStatus(TaskStatus.QUEUED);

        TaskEvent event = TaskEvent.builder()
                .task(task)
                .eventType(EventType.TASK_QUEUED)
                .message("Task queued for Copilot SDK processing")
                .build();
        taskEventRepository.save(event);

        task = taskRepository.save(task);
        TaskResponse response = taskMapper.toResponse(task);

        sseService.sendTaskEvent(task.getId(), taskMapper.toEventResponse(event));
        sseService.broadcastTaskUpdate(response);

        return response;
    }

    @Transactional(readOnly = true)
    public long countByStatus(TaskStatus status) {
        return taskRepository.countByStatus(status);
    }

    /**
     * Resume a completed/failed session with a new prompt.
     */
    @Transactional
    public TaskResponse resumeTask(UUID taskId, String resumePrompt) {
        Task task = taskRepository.findById(taskId)
            .orElseThrow(() -> new IllegalArgumentException(TASK_NOT_FOUND_MSG + taskId));

        if (task.getStatus() != TaskStatus.COMPLETED && task.getStatus() != TaskStatus.FAILED) {
            throw new IllegalStateException("Can only resume completed or failed tasks");
        }

        task.setStatus(TaskStatus.PENDING);
        task.setResumePrompt(resumePrompt);
        task.setResumeCount(task.getResumeCount() + 1);
        task.setErrorMessage(null);
        task.setCompletedAt(null);

        TaskEvent event = TaskEvent.builder()
                .task(task)
                .eventType(EventType.TASK_QUEUED)
                .message("Session resumed (attempt #" + task.getResumeCount() + "): " + resumePrompt)
                .build();
        taskEventRepository.save(event);

        task = taskRepository.save(task);
        TaskResponse response = taskMapper.toResponse(task);

        sseService.sendTaskEvent(task.getId(), taskMapper.toEventResponse(event));
        sseService.broadcastTaskUpdate(response);

        log.info("Task {} resumed with prompt: {}", taskId, resumePrompt);
        return response;
    }

    /**
     * Create a pull request for a task via Bitbucket API.
     * Called from the frontend Copilot session after code has been pushed.
     */
    @Transactional
    public PullRequestResponse createPullRequestForTask(UUID taskId, CreatePullRequestTaskRequest request) {
        log.info("Creating PR for task {}: {} -> {}", taskId, request.branchName(), request.targetBranch());

        Task task = taskRepository.findById(taskId)
            .orElseThrow(() -> new IllegalArgumentException(TASK_NOT_FOUND_MSG + taskId));

        String projectKey = task.getProjectKey();
        String repoSlug = task.getRepositorySlug();
        String title = request.title() != null ? request.title() : "PromptDev: " + task.getTitle();
        String description = request.description() != null ? request.description() 
            : String.format("Task ID: %s%n%nPrompt:%n%s", taskId, task.getPrompt());

        // Create PR via Bitbucket API
        PullRequestResponse pr = bitbucketService.createPullRequest(
                projectKey,
                repoSlug,
                title,
                description,
                request.branchName(),
                request.targetBranch(),
                Collections.emptyList()
        );

        // Update task with PR info
        task.setPullRequestId(pr.id().intValue());
        task.setPullRequestUrl(bitbucketService.getPullRequestWebUrl(projectKey, repoSlug, pr.id()));
        task.setStatus(TaskStatus.CREATING_PR);
        task = taskRepository.save(task);

        // Create event
        TaskEvent event = TaskEvent.builder()
                .task(task)
                .eventType(EventType.PR_CREATED)
                .message("Pull request created: " + task.getPullRequestUrl())
                .build();
        taskEventRepository.save(event);

        // Notify SSE
        sseService.sendTaskEvent(task.getId(), taskMapper.toEventResponse(event));
        sseService.broadcastTaskUpdate(taskMapper.toResponse(task));

        log.info("PR created for task {}: PR #{}", taskId, pr.id());
        return pr;
    }
}
