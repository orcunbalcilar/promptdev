package com.promptdev.mapper;

import com.promptdev.dto.JiraIssueOptOutResponse;
import com.promptdev.entity.JiraIssueOptOut;
import org.springframework.stereotype.Component;

/**
 * Mapper for converting JiraIssueOptOut entities to DTOs.
 */
@Component
public class JiraIssueOptOutMapper {

    public JiraIssueOptOutResponse toResponse(JiraIssueOptOut optOut) {
        return JiraIssueOptOutResponse.builder()
                .id(optOut.getId())
                .userId(optOut.getUser() != null ? optOut.getUser().getId() : null)
                .jiraIssueKey(optOut.getJiraIssueKey())
                .reason(optOut.getReason())
                .createdAt(optOut.getCreatedAt())
                .build();
    }
}
