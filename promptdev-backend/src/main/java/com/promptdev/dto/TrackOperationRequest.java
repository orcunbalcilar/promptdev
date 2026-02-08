package com.promptdev.dto;

import com.promptdev.entity.OperationType;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for tracking a Copilot operation.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrackOperationRequest {

    /** SDK session ID (from nanoid) */
    private String sessionId;

    /** Task ID if associated */
    private String taskId;

    @NotNull(message = "Operation type is required")
    private OperationType operationType;

    private String message;
    private String details;
    private String toolName;
    private String model;
    private Long inputTokens;
    private Long outputTokens;
    private Long durationMs;
    private Boolean success;
    private String errorMessage;
    private String source;
    private String clientInfo;
}
