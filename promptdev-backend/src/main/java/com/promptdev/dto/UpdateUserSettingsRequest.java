package com.promptdev.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for updating user settings.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateUserSettingsRequest {

    // Bitbucket settings
    private String bitbucketUrl;
    private String bitbucketProjectKey;
    private String bitbucketUsername;
    /** Raw Bitbucket token — will be encrypted before storage */
    private String bitbucketToken;

    /** Raw Copilot/GitHub token — will be encrypted before storage */
    private String copilotToken;

    // BYOK Provider settings
    /** Provider type: openai, azure, anthropic */
    private String byokProviderType;
    /** Provider base URL */
    private String byokBaseUrl;
    /** Raw API key — will be encrypted before storage */
    private String byokApiKey;
    /** Azure API version (only for azure provider type) */
    private String byokAzureApiVersion;

    // Jira settings
    private String jiraUrl;
    private String jiraProjectKey;
    private String jiraUsername;
    /** Raw Jira token — will be encrypted before storage */
    private String jiraToken;

    // Jira auto-task settings
    private Boolean jiraAutoTaskEnabled;
    private String jiraAutoTaskModelId;
    private String jiraAutoTaskRepository;
    private String jiraAutoTaskSourceBranch;
    private String jiraAutoTaskTargetBranch;
    private String jiraAutoTaskPrompt;
    private Boolean jiraAutoTaskIterative;
    private Integer jiraAutoTaskMaxIterations;
    private Boolean jiraAutoTaskReviewEnabled;

    // Custom system prompt
    private String customSystemPrompt;
}
