package com.promptdev.dto;

import com.promptdev.entity.ScheduledJobType;
import com.promptdev.entity.WorkspaceType;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for creating a scheduled job.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateScheduledJobRequest {

    @NotBlank(message = "Name is required")
    private String name;

    private String description;

    @NotBlank(message = "Cron expression is required")
    private String cronExpression;

    @NotBlank(message = "Prompt template is required")
    private String promptTemplate;

    @Builder.Default
    private ScheduledJobType jobType = ScheduledJobType.MAINTENANCE;

    @Builder.Default
    private WorkspaceType workspaceType = WorkspaceType.BITBUCKET;

    @NotBlank(message = "Workspace reference (repo slug or local path) is required")
    private String workspaceRef;

    private String sourceBranch;

    private String targetBranch;

    private String modelId;

    @Builder.Default
    private Integer maxIterations = 10;
}
