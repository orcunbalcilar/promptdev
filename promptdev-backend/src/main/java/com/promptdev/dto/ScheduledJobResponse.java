package com.promptdev.dto;

import com.promptdev.entity.ScheduledJobType;
import com.promptdev.entity.WorkspaceType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Response DTO for scheduled job information.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScheduledJobResponse {

    private UUID id;
    private String name;
    private String description;
    private String cronExpression;
    private String promptTemplate;
    private ScheduledJobType jobType;
    private WorkspaceType workspaceType;
    private String workspaceRef;

    private String projectKey;
    private String sourceBranch;
    private String targetBranch;
    private String modelId;
    private Boolean enabled;
    private Integer maxIterations;
    private LocalDateTime lastRunAt;
    private LocalDateTime nextRunAt;
    private UUID lastTaskId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
