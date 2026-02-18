package com.promptdev.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Tracks Jira issues that users have explicitly opted out of auto-task creation.
 * When a user cancels a task related to a Jira issue, we record that they don't
 * want automatic tasks created for that issue anymore.
 */
@Entity
@Table(
    name = "jira_issue_opt_outs",
    uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "jira_issue_key"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JiraIssueOptOut {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Jira issue key (e.g., PROJ-123) that the user opted out of */
    @Column(name = "jira_issue_key", nullable = false)
    private String jiraIssueKey;

    /** Optional reason for opt-out (e.g., "User cancelled task manually") */
    @Column(name = "reason")
    private String reason;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        JiraIssueOptOut that = (JiraIssueOptOut) o;
        return id != null && id.equals(that.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
