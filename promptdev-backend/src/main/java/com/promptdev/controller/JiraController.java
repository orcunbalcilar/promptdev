package com.promptdev.controller;

import com.promptdev.dto.jira.JiraIssueResponse;
import com.promptdev.dto.jira.JiraSearchResponse;
import com.promptdev.dto.jira.JiraTransitionResponse;
import com.promptdev.service.JiraService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * REST controller for Jira Server integration.
 * Only available when jira.base-url is configured.
 */
@RestController
@RequestMapping("/jira")
@RequiredArgsConstructor
@Slf4j
@ConditionalOnBean(JiraService.class)
public class JiraController {

    private final JiraService jiraService;

    @GetMapping("/issues/search")
    public ResponseEntity<JiraSearchResponse> searchIssues(
            @RequestParam String jql,
            @RequestParam(defaultValue = "0") int startAt,
            @RequestParam(defaultValue = "50") int maxResults) {
        log.info("Searching Jira issues with JQL: {}", jql);
        JiraSearchResponse response = jiraService.searchIssues(jql, startAt, maxResults);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/issues/{issueKey}")
    public ResponseEntity<JiraIssueResponse> getIssue(@PathVariable String issueKey) {
        log.info("Fetching Jira issue: {}", issueKey);
        JiraIssueResponse response = jiraService.getIssue(issueKey);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/issues/{issueKey}/transitions")
    public ResponseEntity<JiraTransitionResponse> getTransitions(@PathVariable String issueKey) {
        log.info("Fetching transitions for issue: {}", issueKey);
        JiraTransitionResponse response = jiraService.getTransitions(issueKey);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/issues/{issueKey}/transition")
    public ResponseEntity<Void> transitionIssue(
            @PathVariable String issueKey,
            @RequestBody Map<String, String> body) {
        String transitionId = body.get("transitionId");
        if (transitionId == null || transitionId.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        log.info("Transitioning issue {} with transition {}", issueKey, transitionId);
        jiraService.transitionIssue(issueKey, transitionId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/issues/{issueKey}/comment")
    public ResponseEntity<Void> addComment(
            @PathVariable String issueKey,
            @RequestBody Map<String, String> body) {
        String comment = body.get("comment");
        if (comment == null || comment.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        log.info("Adding comment to issue: {}", issueKey);
        jiraService.addComment(issueKey, comment);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/issues/{issueKey}/assign")
    public ResponseEntity<Void> assignIssue(
            @PathVariable String issueKey,
            @RequestBody Map<String, String> body) {
        String username = body.get("username");
        if (username == null || username.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        log.info("Assigning issue {} to user {}", issueKey, username);
        jiraService.assignIssue(issueKey, username);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/projects/{projectKey}/issues")
    public ResponseEntity<JiraSearchResponse> getIssuesByProject(
            @PathVariable String projectKey,
            @RequestParam(defaultValue = "0") int startAt,
            @RequestParam(defaultValue = "50") int maxResults) {
        log.info("Fetching issues for project: {}", projectKey);
        JiraSearchResponse response = jiraService.getIssuesByProject(projectKey, startAt, maxResults);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/users/{username}/issues")
    public ResponseEntity<JiraSearchResponse> getAssignedIssues(
            @PathVariable String username,
            @RequestParam(defaultValue = "0") int startAt,
            @RequestParam(defaultValue = "50") int maxResults) {
        log.info("Fetching issues assigned to user: {}", username);
        JiraSearchResponse response = jiraService.getAssignedIssues(username, startAt, maxResults);
        return ResponseEntity.ok(response);
    }
}
