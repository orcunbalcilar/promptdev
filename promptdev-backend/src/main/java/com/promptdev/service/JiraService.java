package com.promptdev.service;

import com.promptdev.dto.jira.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Map;

/**
 * Service for Jira Server REST API integration.
 * Only available when jira.base-url is configured.
 */
@Service
@ConditionalOnBean(name = "jiraRestClient")
public class JiraService {

    private static final Logger log = LoggerFactory.getLogger(JiraService.class);

    private final RestClient jiraRestClient;

    public JiraService(RestClient jiraRestClient) {
        this.jiraRestClient = jiraRestClient;
    }

    /**
     * Search issues using JQL
     */
    public JiraSearchResponse searchIssues(String jql, int startAt, int maxResults) {
        log.info("Searching Jira issues with JQL: {}", jql);
        return jiraRestClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/search")
                        .queryParam("jql", jql)
                        .queryParam("startAt", startAt)
                        .queryParam("maxResults", maxResults)
                        .build())
                .retrieve()
                .body(JiraSearchResponse.class);
    }

    /**
     * Get a single issue by key
     */
    public JiraIssueResponse getIssue(String issueKey) {
        log.info("Fetching Jira issue: {}", issueKey);
        return jiraRestClient.get()
                .uri("/issue/{issueKey}", issueKey)
                .retrieve()
                .body(JiraIssueResponse.class);
    }

    /**
     * Get available transitions for an issue
     */
    public JiraTransitionResponse getTransitions(String issueKey) {
        log.info("Fetching transitions for issue: {}", issueKey);
        return jiraRestClient.get()
                .uri("/issue/{issueKey}/transitions", issueKey)
                .retrieve()
                .body(JiraTransitionResponse.class);
    }

    /**
     * Transition an issue to a new status
     */
    public void transitionIssue(String issueKey, String transitionId) {
        log.info("Transitioning issue {} with transition {}", issueKey, transitionId);
        JiraTransitionRequest request = new JiraTransitionRequest(
                new JiraTransitionRequest.JiraTransitionInfo(transitionId));

        jiraRestClient.post()
                .uri("/issue/{issueKey}/transitions", issueKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .toBodilessEntity();
    }

    /**
     * Add a comment to an issue
     */
    public void addComment(String issueKey, String comment) {
        log.info("Adding comment to issue: {}", issueKey);
        JiraCommentRequest request = new JiraCommentRequest(comment);

        jiraRestClient.post()
                .uri("/issue/{issueKey}/comment", issueKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .toBodilessEntity();
    }

    /**
     * Assign an issue to a user
     */
    public void assignIssue(String issueKey, String username) {
        log.info("Assigning issue {} to user {}", issueKey, username);
        Map<String, String> request = Map.of("name", username);

        jiraRestClient.put()
                .uri("/issue/{issueKey}/assignee", issueKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .toBodilessEntity();
    }

    /**
     * Get issues by project key
     */
    public JiraSearchResponse getIssuesByProject(String projectKey, int startAt, int maxResults) {
        log.info("Fetching issues for project: {}", projectKey);
        String jql = "project = " + projectKey + " ORDER BY created DESC";
        return searchIssues(jql, startAt, maxResults);
    }

    /**
     * Get issues assigned to a user
     */
    public JiraSearchResponse getAssignedIssues(String username, int startAt, int maxResults) {
        log.info("Fetching issues assigned to user: {}", username);
        String jql = "assignee = " + username + " AND status != Done ORDER BY priority DESC";
        return searchIssues(jql, startAt, maxResults);
    }
}
