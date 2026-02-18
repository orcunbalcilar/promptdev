package com.promptdev.service;

import com.promptdev.dto.JiraIssueOptOutResponse;
import com.promptdev.entity.JiraIssueOptOut;
import com.promptdev.entity.User;
import com.promptdev.mapper.JiraIssueOptOutMapper;
import com.promptdev.repository.JiraIssueOptOutRepository;
import com.promptdev.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service for managing Jira issue opt-outs.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class JiraIssueOptOutService {

    private final JiraIssueOptOutRepository optOutRepository;
    private final UserRepository userRepository;
    private final JiraIssueOptOutMapper optOutMapper;

    /**
     * Get all opt-outs for a user.
     */
    public List<JiraIssueOptOutResponse> getUserOptOuts(UUID userId) {
        List<JiraIssueOptOut> optOuts = optOutRepository.findByUserIdOrderByCreatedAtDesc(userId);
        return optOuts.stream()
                .map(optOutMapper::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Create an opt-out for a specific Jira issue.
     */
    @Transactional
    public JiraIssueOptOutResponse createOptOut(UUID userId, String jiraIssueKey, String reason) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        // Check if opt-out already exists
        if (optOutRepository.existsByUserAndJiraIssueKey(user, jiraIssueKey)) {
            throw new IllegalStateException("User already opted out of issue: " + jiraIssueKey);
        }

        JiraIssueOptOut optOut = JiraIssueOptOut.builder()
                .user(user)
                .jiraIssueKey(jiraIssueKey)
                .reason(reason != null ? reason : "User opted out manually")
                .build();

        optOut = optOutRepository.save(optOut);
        log.info("Created opt-out for user {} and issue {}", userId, jiraIssueKey);

        return optOutMapper.toResponse(optOut);
    }

    /**
     * Delete an opt-out to re-enable automatic task creation.
     */
    @Transactional
    public void deleteOptOut(UUID userId, String jiraIssueKey) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        optOutRepository.deleteByUserAndJiraIssueKey(user, jiraIssueKey);
        log.info("Deleted opt-out for user {} and issue {}", userId, jiraIssueKey);
    }

    /**
     * Check if a user has opted out of a specific Jira issue.
     */
    public boolean hasOptedOut(UUID userId, String jiraIssueKey) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return false;
        }
        return optOutRepository.existsByUserAndJiraIssueKey(user, jiraIssueKey);
    }
}
