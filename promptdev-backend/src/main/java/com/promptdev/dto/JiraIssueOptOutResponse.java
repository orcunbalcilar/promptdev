package com.promptdev.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Response DTO for Jira issue opt-out records.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JiraIssueOptOutResponse {
    private UUID id;
    private UUID userId;
    private String jiraIssueKey;
    private String reason;
    private LocalDateTime createdAt;
}
