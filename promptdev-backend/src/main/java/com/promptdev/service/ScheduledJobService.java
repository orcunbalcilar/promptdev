package com.promptdev.service;

import com.promptdev.dto.CreateScheduledJobRequest;
import com.promptdev.dto.CreateTaskRequest;
import com.promptdev.dto.ScheduledJobResponse;
import com.promptdev.dto.TaskResponse;
import com.promptdev.entity.ScheduledJob;
import com.promptdev.entity.ScheduledJobType;
import com.promptdev.repository.ScheduledJobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Service for managing scheduled recurring jobs.
 * Jobs create tasks automatically based on cron expressions.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ScheduledJobService {

    private final ScheduledJobRepository scheduledJobRepository;
    private final TaskService taskService;

    @Transactional
    public ScheduledJobResponse createJob(CreateScheduledJobRequest request) {
        log.info("Creating scheduled job: {}", request.getName());

        // Validate cron expression
        CronExpression cronExpression = CronExpression.parse(request.getCronExpression());

        LocalDateTime nextRun = cronExpression.next(LocalDateTime.now());

        ScheduledJob job = ScheduledJob.builder()
                .name(request.getName())
                .description(request.getDescription())
                .cronExpression(request.getCronExpression())
                .promptTemplate(request.getPromptTemplate())
                .jobType(request.getJobType() != null ? request.getJobType() : ScheduledJobType.MAINTENANCE)
                .workspaceType(request.getWorkspaceType())
                .workspaceRef(request.getWorkspaceRef())
                .sourceBranch(request.getSourceBranch() != null ? request.getSourceBranch() : "main")
                .targetBranch(request.getTargetBranch() != null ? request.getTargetBranch() : "main")
                .modelId(request.getModelId() != null ? request.getModelId() : "gpt-5.2")
                .maxIterations(request.getMaxIterations() != null ? request.getMaxIterations() : 10)
                .nextRunAt(nextRun)
                .build();

        job = scheduledJobRepository.save(job);
        log.info("Scheduled job created with ID: {}, next run: {}", job.getId(), nextRun);

        return toResponse(job);
    }

    @Transactional(readOnly = true)
    public ScheduledJobResponse getJob(UUID jobId) {
        ScheduledJob job = scheduledJobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Scheduled job not found: " + jobId));
        return toResponse(job);
    }

    @Transactional(readOnly = true)
    public List<ScheduledJobResponse> getAllJobs() {
        return scheduledJobRepository.findByEnabledTrueOrderByNextRunAtAsc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ScheduledJobResponse> getJobsByType(ScheduledJobType jobType) {
        return scheduledJobRepository.findByJobType(jobType)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public ScheduledJobResponse toggleJob(UUID jobId) {
        ScheduledJob job = scheduledJobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Scheduled job not found: " + jobId));
        job.setEnabled(!job.getEnabled());

        if (job.getEnabled()) {
            CronExpression cron = CronExpression.parse(job.getCronExpression());
            job.setNextRunAt(cron.next(LocalDateTime.now()));
        }

        job = scheduledJobRepository.save(job);
        log.info("Scheduled job {} {}", jobId, job.getEnabled() ? "enabled" : "disabled");
        return toResponse(job);
    }

    @Transactional
    public void deleteJob(UUID jobId) {
        scheduledJobRepository.deleteById(jobId);
        log.info("Scheduled job deleted: {}", jobId);
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> getJobHistory(UUID jobId) {
        return taskService.getTasksByScheduledJobId(jobId);
    }

    /**
     * Execute due scheduled jobs. Called by the scheduler.
     */
    @Transactional
    public void executeDueJobs() {
        List<ScheduledJob> dueJobs = scheduledJobRepository.findDueJobs(LocalDateTime.now());

        for (ScheduledJob job : dueJobs) {
            try {
                log.info("Executing scheduled job: {} ({})", job.getName(), job.getId());

                // Create task from job template
                CreateTaskRequest taskRequest = CreateTaskRequest.builder()
                        .title("[Scheduled] " + job.getName())
                        .prompt(job.getPromptTemplate())
                        .repositorySlug(job.getWorkspaceRef())
                        .workspaceType(job.getWorkspaceType())
                        .sourceBranch(job.getSourceBranch())
                        .targetBranch(job.getTargetBranch())
                        .modelId(job.getModelId())
                        .iterative(true)
                        .maxIterations(job.getMaxIterations())
                        .build();

                TaskResponse task = taskService.createTask(taskRequest);

                // Update job metadata
                job.setLastRunAt(LocalDateTime.now());
                job.setLastTaskId(task.getId());

                CronExpression cron = CronExpression.parse(job.getCronExpression());
                job.setNextRunAt(cron.next(LocalDateTime.now()));

                scheduledJobRepository.save(job);
                log.info("Scheduled job {} created task {}", job.getId(), task.getId());

            } catch (Exception e) {
                log.error("Failed to execute scheduled job {}: {}", job.getId(), e.getMessage(), e);
            }
        }
    }

    private ScheduledJobResponse toResponse(ScheduledJob job) {
        return ScheduledJobResponse.builder()
                .id(job.getId())
                .name(job.getName())
                .description(job.getDescription())
                .cronExpression(job.getCronExpression())
                .promptTemplate(job.getPromptTemplate())
                .jobType(job.getJobType())
                .workspaceType(job.getWorkspaceType())
                .workspaceRef(job.getWorkspaceRef())
                .sourceBranch(job.getSourceBranch())
                .targetBranch(job.getTargetBranch())
                .modelId(job.getModelId())
                .enabled(job.getEnabled())
                .maxIterations(job.getMaxIterations())
                .lastRunAt(job.getLastRunAt())
                .nextRunAt(job.getNextRunAt())
                .lastTaskId(job.getLastTaskId())
                .createdAt(job.getCreatedAt())
                .updatedAt(job.getUpdatedAt())
                .build();
    }
}
