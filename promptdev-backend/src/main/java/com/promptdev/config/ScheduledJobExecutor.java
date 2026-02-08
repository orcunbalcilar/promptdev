package com.promptdev.config;

import com.promptdev.service.ScheduledJobService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.Scheduled;

/**
 * Configuration for executing scheduled jobs at regular intervals.
 * Checks for due jobs every minute.
 */
@Configuration
@RequiredArgsConstructor
@Slf4j
public class ScheduledJobExecutor {

    private final ScheduledJobService scheduledJobService;

    @Scheduled(fixedRate = 60_000) // Check every minute
    public void checkAndExecuteDueJobs() {
        scheduledJobService.executeDueJobs();
    }
}
