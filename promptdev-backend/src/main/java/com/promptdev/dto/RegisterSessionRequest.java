package com.promptdev.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for registering a new Copilot session in monitoring.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegisterSessionRequest {

    /** The SDK session ID (from nanoid) */
    private String sdkSessionId;

    /** Model used */
    private String model;

    /** Reasoning effort */
    private String reasoningEffort;

    /** Optional task ID association */
    private String taskId;

    /** Source of session creation: web, slack, cli, api */
    private String source;
}
