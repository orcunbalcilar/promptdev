package com.promptdev.dto;

import com.promptdev.entity.TaskStatus;
import com.promptdev.entity.WorkspaceType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Response DTO for task information.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaskResponse {

    private UUID id;
    private String title;
    private String prompt;
    private String repositorySlug;
    private String projectKey;
    private WorkspaceType workspaceType;
    private String workspacePath;
    private String sourceBranch;
    private String targetBranch;
    private TaskStatus status;
    private Integer currentAttempt;
    private Integer maxAttempts;
    private String modelId;
    private String copilotSessionId;
    private Integer pullRequestId;
    private String pullRequestUrl;
    private String errorMessage;
    private Boolean iterative;
    private Integer maxIterations;
    private Integer currentIteration;
    private Integer currentStepIndex;
    private String completionCriteria;
    private String steps;
    private UUID scheduledJobId;
    private String jiraIssueKey;
    private Boolean reviewEnabled;
    private String reviewModelId;
    private String resumePrompt;
    private Integer resumeCount;
    private String commitMessagePattern;
    private String bootScript;
    private String skills;
    private String additionalRepositories;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime completedAt;
    private List<TaskEventResponse> events;
}
