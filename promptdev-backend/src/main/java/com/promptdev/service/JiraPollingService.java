package com.promptdev.service;

import com.promptdev.config.JiraConfig;
import com.promptdev.dto.CreateTaskRequest;
import com.promptdev.dto.jira.JiraIssueResponse;
import com.promptdev.dto.jira.JiraSearchResponse;
import com.promptdev.entity.TaskStatus;
import com.promptdev.entity.User;
import com.promptdev.entity.WorkspaceType;
import com.promptdev.repository.JiraIssueOptOutRepository;
import com.promptdev.repository.TaskRepository;
import com.promptdev.repository.UserRepository;
import java.util.Collection;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.stereotype.Service;

/**
 * Polls Jira for issues assigned to users with auto-task creation enabled. Creates PromptDev tasks
 * automatically for new Jira assignments.
 *
 * <p>This service is only active when JiraService is available (i.e., jira.base-url is
 * configured).
 */
@Service
@ConditionalOnBean(JiraService.class)
@RequiredArgsConstructor
@Slf4j
public class JiraPollingService {

    private final JiraService jiraService;
    private final JiraConfig jiraConfig;
    private final TaskService taskService;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final JiraIssueOptOutRepository jiraIssueOptOutRepository;

    /**
     * Terminal statuses — issues linked to tasks in these statuses can be re-created.
     */
    private static final List<TaskStatus> TERMINAL_STATUSES = List.of(TaskStatus.FAILED,
        TaskStatus.COMPLETED);

    /**
     * Poll Jira for each user with an auto-task enabled and create tasks for new assignments.
     * Called periodically by ScheduledJobExecutor.
     */
    public void pollAndCreateTasks() {
        Collection<User> users = userRepository.findByJiraAutoTaskEnabledTrue().stream()
            .collect(Collectors.toMap(User::getJiraUsername, u -> u, (u1, u2) -> u1)).values();
        if (users.isEmpty()) {
            return;
        }

        log.debug("Polling Jira for {} user(s) with auto-task enabled", users.size());

        for (User user : users) {
            pollForUser(user);
        }
    }

    private void pollForUser(User user) {
        String username = user.getJiraUsername();
        if (username == null || username.isBlank()) {
            // Fallback to global configuration if a user-specific setting is missing
            username = jiraConfig.getUsername();
        }

        if (username == null || username.isBlank()) {
            log.warn("User {} has Jira auto-task enabled but no Jira username configured",
                user.getId());
            return;
        }

        String repository = user.getJiraAutoTaskRepository();
        if (repository == null || repository.isBlank()) {
            // Fallback to the default repository if missing
            repository = "promptdev";
        }

        try {
            // Search for open issues assigned to the user
            String projectKey = user.getJiraProjectKey();
            if (projectKey == null || projectKey.isBlank()) {
                projectKey = jiraConfig.getProjectKey();
            }

            String jql = buildJql(username, projectKey);
            JiraSearchResponse searchResult = jiraService.searchIssues(jql, 0, 20);

            if (searchResult.issues() == null || searchResult.issues().isEmpty()) {
                return;
            }

            log.info("Found {} Jira issue(s) assigned to {} for auto-task creation",
                searchResult.issues().size(), username);

            for (JiraIssueResponse issue : searchResult.issues()) {
                createTaskForIssue(user, issue, repository);
            }
        } catch (Exception e) {
            log.error("Failed to poll Jira for user {}: {}", user.getId(), e.getMessage());
        }
    }

    private String buildJql(String username, String projectKey) {
        StringBuilder jql = new StringBuilder();
        jql.append("assignee = ").append(username);
        jql.append(" AND status NOT IN (Done, Closed, Resolved)");
        if (projectKey != null && !projectKey.isBlank()) {
            jql.append(" AND project = ").append(projectKey);
        }
        jql.append(" ORDER BY priority DESC, created ASC");
        return jql.toString();
    }

    private void createTaskForIssue(User user, JiraIssueResponse issue, String repository) {
        String issueKey = issue.key();

        // Skip if user has opted out of auto-task creation for this issue
        boolean hasOptedOut = jiraIssueOptOutRepository.existsByUserAndJiraIssueKey(user, issueKey);
        if (hasOptedOut) {
            log.debug("Skipping Jira issue {} — user {} has opted out of auto-task creation", 
                issueKey, user.getId());
            return;
        }

        // Skip if a non-terminal task already exists for this Jira issue
        boolean alreadyExists = taskRepository.existsByJiraIssueKeyAndStatusNotIn(issueKey,
            TERMINAL_STATUSES);
        if (alreadyExists) {
            log.debug("Skipping Jira issue {} — task already exists", issueKey);
            return;
        }

        try {
            String title = String.format("[%s] %s", issueKey, issue.fields().summary());
            String prompt;
            if (user.getJiraAutoTaskPrompt() != null && !user.getJiraAutoTaskPrompt().isBlank()) {
                String description = issue.fields().description();
                if (description == null) description = "";
                String priority = issue.fields().priority() != null ? issue.fields().priority().name() : "Medium";
                
                prompt = user.getJiraAutoTaskPrompt()
                    .replace("{{issueKey}}", issue.key())
                    .replace("{{summary}}", issue.fields().summary())
                    .replace("{{priority}}", priority)
                    .replace("{{description}}", description);
            } else {
                prompt = buildPromptFromIssue(issue);
            }

            Boolean iterative = user.getJiraAutoTaskIterative();
            if (iterative == null) {
                iterative = true;
            }
            
            Integer maxIterations = user.getJiraAutoTaskMaxIterations();
            if (maxIterations == null) {
                maxIterations = 1;
            }
            
            Boolean reviewEnabled = user.getJiraAutoTaskReviewEnabled();
            if (reviewEnabled == null) {
                reviewEnabled = true;
            }

            CreateTaskRequest request = CreateTaskRequest.builder().title(title).prompt(prompt)
                .repositorySlug(repository).workspaceType(WorkspaceType.BITBUCKET).sourceBranch(
                    user.getJiraAutoTaskSourceBranch() != null ? user.getJiraAutoTaskSourceBranch()
                        : "__AUTO_GENERATED__").targetBranch(
                    user.getJiraAutoTaskTargetBranch() != null ? user.getJiraAutoTaskTargetBranch()
                        : "main").modelId(
                    user.getJiraAutoTaskModelId() != null ? user.getJiraAutoTaskModelId()
                        : "gpt-5.2").jiraIssueKey(issueKey)
                .userId(user.getId())
                .iterative(iterative)
                .maxIterations(maxIterations)
                .reviewEnabled(reviewEnabled)
                .commitMessagePattern("[" + issueKey + "] {message}").build();

            taskService.createTask(request);
            log.info("Auto-created task for Jira issue: {}", issueKey);
        } catch (Exception e) {
            log.error("Failed to create task for Jira issue {}: {}", issueKey, e.getMessage());
        }
    }

    private String buildPromptFromIssue(JiraIssueResponse issue) {
        String description = issue.fields().description();
        if (description == null || description.isBlank()) {
            description = "No description provided.";
        }

        String priority =
            issue.fields().priority() != null ? issue.fields().priority().name() : "Medium";

        return String.format("""
                ## Jira Issue: %s - %s
                
                ### Priority: %s
                
                ### Description:
                %s
                
                ### Implementation Instructions:
                Implement the changes described in the Jira issue above. Ensure:
                - All acceptance criteria are met
                - Existing tests continue to pass
                - New functionality is properly tested
                - Code follows project conventions
                - Error handling is comprehensive
                - Changes are well-documented""", issue.key(), issue.fields().summary(), priority,
            description);
    }
}
