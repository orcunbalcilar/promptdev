package com.promptdev.dto;

import com.promptdev.entity.EventType;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Request DTO for callback from Copilot SDK agent.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AgentCallbackRequest {

    @NotNull(message = "Task ID is required")
    private UUID taskId;

    @NotNull(message = "Event type is required")
    private EventType eventType;

    private String message;

    private String details;

    private String codeSnippet;

    private String filePath;

    private String copilotSessionId;

    private Integer pullRequestId;

    private String pullRequestUrl;

    private String errorMessage;
}
