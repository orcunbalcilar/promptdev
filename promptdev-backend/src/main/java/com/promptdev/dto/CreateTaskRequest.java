package com.promptdev.dto;

import com.promptdev.entity.WorkspaceType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for creating a new task.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateTaskRequest {

    @NotBlank(message = "Title is required")
    @Size(max = 255, message = "Title must be less than 255 characters")
    private String title;

    @NotBlank(message = "Prompt is required")
    private String prompt;

    @NotBlank(message = "Repository slug is required")
    private String repositorySlug;

    /** Type of workspace: LOCAL or BITBUCKET */
    @Builder.Default
    private WorkspaceType workspaceType = WorkspaceType.BITBUCKET;

    /** Local filesystem path (when workspaceType is LOCAL) */
    private String workspacePath;

    private String sourceBranch;

    private String targetBranch;

    /** AI model ID to use for the Copilot session */
    private String modelId;

    @Builder.Default
    private Integer maxAttempts = 3;

    // ── Iterative session fields ───────────────────────────────────

    /** Whether this task uses iterative multi-session processing */
    @Builder.Default
    private Boolean iterative = false;

    /** Maximum iterations for iterative sessions */
    @Builder.Default
    private Integer maxIterations = 10;

    /** Completion criteria for iterative sessions */
    private String completionCriteria;

    /** Steps definition for multi-step tasks (JSON array of step descriptions) */
    private String steps;
}
