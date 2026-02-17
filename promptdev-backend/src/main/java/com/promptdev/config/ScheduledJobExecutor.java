package com.promptdev.config;

import com.promptdev.service.JiraPollingService;
import com.promptdev.service.ScheduledJobService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.Scheduled;

/**
 * Configuration for executing scheduled jobs and polling integrations at regular intervals.
 */
@Configuration
@RequiredArgsConstructor
@Slf4j
public class ScheduledJobExecutor {

    private final ScheduledJobService scheduledJobService;

    /** Optional — only injected when JiraService (and thus JiraPollingService) is available. */
    @Autowired(required = false)
    private JiraPollingService jiraPollingService;

    @Scheduled(fixedRate = 60_000) // Check every minute
    public void checkAndExecuteDueJobs() {
        scheduledJobService.executeDueJobs();
    }

    @Scheduled(fixedRate = 300_000) // Poll every 5 minutes
    public void pollJiraForAutoTasks() {
        if (jiraPollingService != null) {
            try {
                jiraPollingService.pollAndCreateTasks();
            } catch (Exception e) {
                log.error("Jira auto-task polling failed: {}", e.getMessage());
            }
        }
    }
}
