package com.promptdev.controller;

import com.promptdev.dto.JiraIssueOptOutResponse;
import com.promptdev.service.JiraIssueOptOutService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST controller for managing Jira issue opt-outs.
 * Users can opt out of automatic task creation for specific Jira issues.
 */
@RestController
@RequestMapping("/jira-opt-outs")
@RequiredArgsConstructor
@Slf4j
public class JiraOptOutController {

    private final JiraIssueOptOutService optOutService;

    /**
     * Get all opt-outs for a user.
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<JiraIssueOptOutResponse>> getUserOptOuts(@PathVariable UUID userId) {
        log.info("Fetching opt-outs for user: {}", userId);
        List<JiraIssueOptOutResponse> optOuts = optOutService.getUserOptOuts(userId);
        return ResponseEntity.ok(optOuts);
    }

    /**
     * Create an opt-out for a specific Jira issue.
     * This prevents automatic task creation for the issue.
     */
    @PostMapping
    public ResponseEntity<JiraIssueOptOutResponse> createOptOut(
            @RequestParam UUID userId,
            @RequestParam String jiraIssueKey,
            @RequestParam(required = false) String reason) {
        log.info("Creating opt-out for user {} and issue {}", userId, jiraIssueKey);
        JiraIssueOptOutResponse optOut = optOutService.createOptOut(userId, jiraIssueKey, reason);
        return ResponseEntity.status(HttpStatus.CREATED).body(optOut);
    }

    /**
     * Delete an opt-out to re-enable automatic task creation for a Jira issue.
     */
    @DeleteMapping
    public ResponseEntity<Void> deleteOptOut(
            @RequestParam UUID userId,
            @RequestParam String jiraIssueKey) {
        log.info("Deleting opt-out for user {} and issue {}", userId, jiraIssueKey);
        optOutService.deleteOptOut(userId, jiraIssueKey);
        return ResponseEntity.noContent().build();
    }

    /**
     * Check if a user has opted out of a specific Jira issue.
     */
    @GetMapping("/check")
    public ResponseEntity<Boolean> checkOptOut(
            @RequestParam UUID userId,
            @RequestParam String jiraIssueKey) {
        boolean hasOptedOut = optOutService.hasOptedOut(userId, jiraIssueKey);
        return ResponseEntity.ok(hasOptedOut);
    }
}
