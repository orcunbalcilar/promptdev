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
