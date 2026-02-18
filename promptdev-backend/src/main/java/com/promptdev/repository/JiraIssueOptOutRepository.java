package com.promptdev.repository;

import com.promptdev.entity.JiraIssueOptOut;
import com.promptdev.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for managing Jira issue opt-outs.
 */
@Repository
public interface JiraIssueOptOutRepository extends JpaRepository<JiraIssueOptOut, UUID> {

    /**
     * Check if a user has opted out of auto-task creation for a specific Jira issue.
     */
    boolean existsByUserAndJiraIssueKey(User user, String jiraIssueKey);

    /**
     * Find opt-out record for a user and Jira issue.
     */
    Optional<JiraIssueOptOut> findByUserAndJiraIssueKey(User user, String jiraIssueKey);

    /**
     * Get all opt-outs for a user.
     */
    List<JiraIssueOptOut> findByUserOrderByCreatedAtDesc(User user);

    /**
     * Get all opt-outs for a user by user ID.
     */
    List<JiraIssueOptOut> findByUserIdOrderByCreatedAtDesc(UUID userId);

    /**
     * Delete opt-out for a user and Jira issue (to re-enable auto-task creation).
     */
    void deleteByUserAndJiraIssueKey(User user, String jiraIssueKey);
}
