package com.promptdev.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Represents a recurring scheduled job that creates tasks automatically.
 * Supports maintenance, code review, test coverage, and other regular operations.
 */
@Entity
@Table(name = "scheduled_jobs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScheduledJob {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    /** Cron expression for scheduling (e.g., "0 0 2 * * MON" for Monday 2am) */
    @Column(name = "cron_expression", nullable = false)
    private String cronExpression;

    /** The prompt template to use when creating tasks */
    @Column(name = "prompt_template", columnDefinition = "TEXT", nullable = false)
    private String promptTemplate;

    @Enumerated(EnumType.STRING)
    @Column(name = "job_type", nullable = false)
    @Builder.Default
    private ScheduledJobType jobType = ScheduledJobType.MAINTENANCE;

    @Enumerated(EnumType.STRING)
    @Column(name = "workspace_type", nullable = false)
    @Builder.Default
    private WorkspaceType workspaceType = WorkspaceType.BITBUCKET;

    /** Repository slug (for BITBUCKET) or local path (for LOCAL) */
    @Column(name = "workspace_ref", nullable = false)
    private String workspaceRef;

    @Column(name = "source_branch")
    @Builder.Default
    private String sourceBranch = "main";

    @Column(name = "target_branch")
    @Builder.Default
    private String targetBranch = "main";

    /** Model to use for the Copilot session */
    @Column(name = "model_id")
    @Builder.Default
    private String modelId = "gpt-5.2";

    @Column(nullable = false)
    @Builder.Default
    private Boolean enabled = true;

    /** Maximum iterations for iterative sessions */
    @Column(name = "max_iterations")
    @Builder.Default
    private Integer maxIterations = 10;

    @Column(name = "last_run_at")
    private LocalDateTime lastRunAt;

    @Column(name = "next_run_at")
    private LocalDateTime nextRunAt;

    @Column(name = "last_task_id")
    private UUID lastTaskId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ScheduledJob job = (ScheduledJob) o;
        return id != null && id.equals(job.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
