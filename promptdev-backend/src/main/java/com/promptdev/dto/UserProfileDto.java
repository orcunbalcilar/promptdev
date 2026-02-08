package com.promptdev.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for user profile and settings.
 * Sensitive tokens are never returned to the client — only a masked indicator.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserProfileDto {

    private String id;
    private String email;
    private String name;
    private String avatarUrl;
    private String provider;

    // Bitbucket settings
    private String bitbucketUrl;
    private String bitbucketProjectKey;
    private String bitbucketUsername;
    /** True if a Bitbucket token is stored, false otherwise. Never exposes the actual token. */
    private boolean bitbucketTokenSet;

    /** True if a Copilot/GitHub token is stored per-user, false otherwise. */
    private boolean copilotTokenSet;

    // BYOK Provider settings
    /** BYOK provider type (openai, azure, anthropic) — null if not configured */
    private String byokProviderType;
    /** BYOK provider base URL — null if not configured */
    private String byokBaseUrl;
    /** True if a BYOK API key is stored, false otherwise. */
    private boolean byokApiKeySet;
}
