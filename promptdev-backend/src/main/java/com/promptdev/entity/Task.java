package com.promptdev.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Represents a development task that can be processed by the AI agent.
 */
@Entity
@Table(name = "tasks")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = "events")
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String prompt;

    @Column(name = "repository_slug", nullable = false)
    private String repositorySlug;

    /** Bitbucket project key (when workspaceType is BITBUCKET) */
    @Column(name = "project_key")
    private String projectKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "workspace_type", nullable = false)
    @Builder.Default
    private WorkspaceType workspaceType = WorkspaceType.BITBUCKET;

    /** Local path when workspaceType is LOCAL */
    @Column(name = "workspace_path")
    private String workspacePath;

    @Column(name = "source_branch")
    private String sourceBranch;

    @Column(name = "target_branch")
    private String targetBranch;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private TaskStatus status = TaskStatus.PENDING;

    @Column(name = "current_attempt")
    @Builder.Default
    private Integer currentAttempt = 0;

    @Column(name = "max_attempts")
    @Builder.Default
    private Integer maxAttempts = 3;

    /** AI model ID to use for the Copilot session */
    @Column(name = "model_id")
    @Builder.Default
    private String modelId = "gpt-5.2";

    @Column(name = "copilot_session_id")
    private String copilotSessionId;

    @Column(name = "pull_request_id")
    private Integer pullRequestId;

    @Column(name = "pull_request_url")
    private String pullRequestUrl;

    @Column(columnDefinition = "TEXT")
    private String errorMessage;

    // ── Iterative session (Ralph Wiggum) fields ────────────────────

    /** Whether this task uses iterative multi-session processing */
    @Column(name = "iterative")
    @Builder.Default
    private Boolean iterative = false;

    /** Maximum iterations for iterative sessions */
    @Column(name = "max_iterations")
    @Builder.Default
    private Integer maxIterations = 10;

    /** Current iteration number (1-based) */
    @Column(name = "current_iteration")
    @Builder.Default
    private Integer currentIteration = 0;

    /** Completion criteria for iterative sessions */
    @Column(name = "completion_criteria", columnDefinition = "TEXT")
    private String completionCriteria;

    /** Steps definition for multi-step tasks (JSON array) */
    @Column(name = "steps", columnDefinition = "TEXT")
    private String steps;

    /** Index of current step being processed (0-based) */
    @Column(name = "current_step_index")
    @Builder.Default
    private Integer currentStepIndex = 0;

    /** Reference to the scheduled job that created this task (if any) */
    @Column(name = "scheduled_job_id")
    private UUID scheduledJobId;

    // ── Jira integration fields ────────────────────────────────────

    /** Jira issue key (e.g., PROJ-123) linked to this task */
    @Column(name = "jira_issue_key")
    private String jiraIssueKey;

    // ── Review feature fields ──────────────────────────────────────

    /** Whether auto-review is enabled for this task */
    @Column(name = "review_enabled")
    @Builder.Default
    private Boolean reviewEnabled = true;

    /** Model ID used for reviewing (defaults to same model if null) */
    @Column(name = "review_model_id")
    private String reviewModelId;

    // ── Session resume fields ──────────────────────────────────────

    /** If this task was resumed, the prompt used to resume */
    @Column(name = "resume_prompt", columnDefinition = "TEXT")
    private String resumePrompt;

    /** Number of times this session was resumed */
    @Column(name = "resume_count")
    @Builder.Default
    private Integer resumeCount = 0;

    // ── Ephemeral workspace fields ─────────────────────────────────

    /** Encrypted environment variables JSON for workspace (e.g., secrets, envs) */
    @Column(name = "environment_variables_encrypted", columnDefinition = "TEXT")
    private String environmentVariablesEncrypted;

    /** Commit message pattern (e.g., "[PROJ-123] {message}") */
    @Column(name = "commit_message_pattern")
    private String commitMessagePattern;

    /** Boot script instructions for workspace setup */
    @Column(name = "boot_script", columnDefinition = "TEXT")
    private String bootScript;

    // ── Skills fields ──────────────────────────────────────────────

    /** JSON array of skill names to activate for this task */
    @Column(name = "skills", columnDefinition = "TEXT")
    private String skills;

    // ── Multiple repositories support ──────────────────────────────

    /** JSON array of additional repository slugs for multi-repo tasks */
    @Column(name = "additional_repositories", columnDefinition = "TEXT")
    private String additionalRepositories;

    @OneToMany(mappedBy = "task", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("timestamp ASC")
    @Builder.Default
    private List<TaskEvent> events = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    public void addEvent(TaskEvent event) {
        events.add(event);
        event.setTask(this);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Task task = (Task) o;
        return id != null && id.equals(task.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
