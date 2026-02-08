package com.promptdev.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Request to create a pull request for a task after Copilot has pushed code.
 */
public record CreatePullRequestTaskRequest(
        @NotBlank(message = "Branch name is required")
        String branchName,

        @NotBlank(message = "Target branch is required")
        String targetBranch,

        String title,

        String description
) {}
