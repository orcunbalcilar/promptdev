package com.promptdev.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Represents a user of the PromptDev platform.
 * Stores user profile info and encrypted sensitive settings.
 */
@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** OAuth provider (github, google) */
    @Column(nullable = false)
    private String provider;

    /** Provider account ID */
    @Column(name = "provider_account_id", nullable = false)
    private String providerAccountId;

    @Column(nullable = false)
    private String email;

    @Column
    private String name;

    @Column(name = "avatar_url")
    private String avatarUrl;

    // ── Bitbucket settings (per-user) ──────────────────────────────────

    @Column(name = "bitbucket_url")
    private String bitbucketUrl;

    @Column(name = "bitbucket_project_key")
    private String bitbucketProjectKey;

    @Column(name = "bitbucket_username")
    private String bitbucketUsername;

    /** Encrypted Bitbucket token */
    @Column(name = "bitbucket_token_encrypted")
    private String bitbucketTokenEncrypted;

    // ── Copilot / GitHub token (per-user) ──────────────────────────────

    /** Encrypted GitHub/Copilot token for per-user isolated sessions */
    @Column(name = "copilot_token_encrypted")
    private String copilotTokenEncrypted;

    // ── BYOK Provider settings (per-user) ──────────────────────────────

    /** BYOK provider type (openai, azure, anthropic) */
    @Column(name = "byok_provider_type")
    private String byokProviderType;

    /** BYOK provider base URL */
    @Column(name = "byok_base_url")
    private String byokBaseUrl;

    /** Encrypted BYOK API key */
    @Column(name = "byok_api_key_encrypted")
    private String byokApiKeyEncrypted;

    /** Azure API version (for azure provider type) */
    @Column(name = "byok_azure_api_version")
    private String byokAzureApiVersion;

    // ── Jira settings (per-user) ───────────────────────────────────

    @Column(name = "jira_url")
    private String jiraUrl;

    @Column(name = "jira_project_key")
    private String jiraProjectKey;

    @Column(name = "jira_username")
    private String jiraUsername;

    /** Encrypted Jira personal access token */
    @Column(name = "jira_token_encrypted")
    private String jiraTokenEncrypted;

    /** Whether automatic task creation from Jira assigned issues is enabled */
    @Column(name = "jira_auto_task_enabled")
    @Builder.Default
    private Boolean jiraAutoTaskEnabled = true;

    /** Default model ID for auto-created Jira tasks */
    @Column(name = "jira_auto_task_model_id")
    private String jiraAutoTaskModelId;

    /** Default repository slug for auto-created Jira tasks */
    @Column(name = "jira_auto_task_repository")
    private String jiraAutoTaskRepository;

    /** Default source branch for auto-created Jira tasks */
    @Column(name = "jira_auto_task_source_branch")
    private String jiraAutoTaskSourceBranch;

    /** Default target branch for auto-created Jira tasks */
    @Column(name = "jira_auto_task_target_branch")
    private String jiraAutoTaskTargetBranch;

    // ── Custom System Prompt ───────────────────────────────────

    /** User's custom system prompt (overrides default in SDLC templates) */
    @Column(name = "custom_system_prompt", columnDefinition = "TEXT")
    private String customSystemPrompt;

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
        User user = (User) o;
        return id != null && id.equals(user.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
