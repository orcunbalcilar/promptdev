package com.promptdev.dto;

import com.promptdev.entity.EventType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Response DTO for task event information.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaskEventResponse {

    private UUID id;
    private EventType eventType;
    private String message;
    private String details;
    private String codeSnippet;
    private String filePath;
    private String actionType;
    private String fileChanges;
    private String toolName;
    private String toolInput;
    private String toolOutput;
    private LocalDateTime timestamp;
}
