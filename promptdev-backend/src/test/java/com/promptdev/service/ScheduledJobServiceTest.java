package com.promptdev.service;

import com.promptdev.dto.CreateScheduledJobRequest;
import com.promptdev.dto.CreateTaskRequest;
import com.promptdev.dto.ScheduledJobResponse;
import com.promptdev.dto.TaskResponse;
import com.promptdev.entity.ScheduledJob;
import com.promptdev.entity.ScheduledJobType;
import com.promptdev.entity.TaskStatus;
import com.promptdev.entity.WorkspaceType;
import com.promptdev.repository.ScheduledJobRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ScheduledJobServiceTest {

    private static final String JOB_NAME = "Weekly Code Review";
    private static final String JOB_DESC = "Automated weekly code review";
    private static final String CRON_WEEKLY = "0 0 9 * * MON";
    private static final String CRON_DAILY = "0 0 2 * * *";
    private static final String PROMPT = "Review all recent code changes";
    private static final String REPO_SLUG = "frontend-app";
    private static final String TEST_JOB_NAME = "Test Job";
    private static final String TEST_PROMPT = "Test prompt";
    private static final String SCHEDULED_TITLE = "[Scheduled] " + JOB_NAME;

    @Mock
    private ScheduledJobRepository scheduledJobRepository;

    @Mock
    private TaskService taskService;

    @InjectMocks
    private ScheduledJobService scheduledJobService;

    private ScheduledJob sampleJob;
    private CreateScheduledJobRequest sampleCreateRequest;

    @BeforeEach
    void setUp() {
        sampleJob = ScheduledJob.builder()
                .id(UUID.randomUUID())
                .name(JOB_NAME)
                .description(JOB_DESC)
                .cronExpression(CRON_WEEKLY)
                .promptTemplate(PROMPT)
                .jobType(ScheduledJobType.CODE_REVIEW)
                .workspaceType(WorkspaceType.BITBUCKET)
                .workspaceRef(REPO_SLUG)
                .sourceBranch("main")
                .targetBranch("main")
                .modelId("gpt-5.2")
                .enabled(true)
                .maxIterations(10)
                .nextRunAt(LocalDateTime.now().plusDays(7))
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        sampleCreateRequest = CreateScheduledJobRequest.builder()
                .name(JOB_NAME)
                .description(JOB_DESC)
                .cronExpression(CRON_WEEKLY)
                .promptTemplate(PROMPT)
                .jobType(ScheduledJobType.CODE_REVIEW)
                .workspaceType(WorkspaceType.BITBUCKET)
                .workspaceRef(REPO_SLUG)
                .build();
    }

    @Nested
    @DisplayName("createJob")
    class CreateJob {

        @Test
        @DisplayName("should create a job with correct fields")
        void shouldCreateJobWithCorrectFields() {
            when(scheduledJobRepository.save(any(ScheduledJob.class)))
                    .thenAnswer(inv -> {
                        ScheduledJob j = inv.getArgument(0);
                        j.setId(UUID.randomUUID());
                        j.setCreatedAt(LocalDateTime.now());
                        j.setUpdatedAt(LocalDateTime.now());
                        return j;
                    });

            ScheduledJobResponse result = scheduledJobService.createJob(sampleCreateRequest);

            assertThat(result.getName()).isEqualTo(JOB_NAME);
            assertThat(result.getDescription()).isEqualTo(JOB_DESC);
            assertThat(result.getCronExpression()).isEqualTo(CRON_WEEKLY);
            assertThat(result.getJobType()).isEqualTo(ScheduledJobType.CODE_REVIEW);
            assertThat(result.getWorkspaceType()).isEqualTo(WorkspaceType.BITBUCKET);
            assertThat(result.getWorkspaceRef()).isEqualTo(REPO_SLUG);
        }

        @Test
        @DisplayName("should calculate next run time from cron expression")
        void shouldCalculateNextRunTime() {
            when(scheduledJobRepository.save(any(ScheduledJob.class)))
                    .thenAnswer(inv -> {
                        ScheduledJob j = inv.getArgument(0);
                        j.setId(UUID.randomUUID());
                        j.setCreatedAt(LocalDateTime.now());
                        j.setUpdatedAt(LocalDateTime.now());
                        return j;
                    });

            ScheduledJobResponse result = scheduledJobService.createJob(sampleCreateRequest);

            assertThat(result.getNextRunAt()).isNotNull();
            assertThat(result.getNextRunAt()).isAfter(LocalDateTime.now());
        }

        @Test
        @DisplayName("should default jobType to MAINTENANCE when not specified")
        void shouldDefaultJobType() {
            CreateScheduledJobRequest request = CreateScheduledJobRequest.builder()
                    .name(TEST_JOB_NAME)
                    .cronExpression(CRON_DAILY)
                    .promptTemplate(TEST_PROMPT)
                    .workspaceRef("repo")
                    .build();

            when(scheduledJobRepository.save(any(ScheduledJob.class)))
                    .thenAnswer(inv -> {
                        ScheduledJob j = inv.getArgument(0);
                        j.setId(UUID.randomUUID());
                        j.setCreatedAt(LocalDateTime.now());
                        j.setUpdatedAt(LocalDateTime.now());
                        return j;
                    });

            ScheduledJobResponse result = scheduledJobService.createJob(request);

            assertThat(result.getJobType()).isEqualTo(ScheduledJobType.MAINTENANCE);
        }

        @Test
        @DisplayName("should default modelId to gpt-5.2 when not specified")
        void shouldDefaultModelId() {
            CreateScheduledJobRequest request = CreateScheduledJobRequest.builder()
                    .name(TEST_JOB_NAME)
                    .cronExpression(CRON_DAILY)
                    .promptTemplate(TEST_PROMPT)
                    .workspaceRef("repo")
                    .build();

            when(scheduledJobRepository.save(any(ScheduledJob.class)))
                    .thenAnswer(inv -> {
                        ScheduledJob j = inv.getArgument(0);
                        j.setId(UUID.randomUUID());
                        j.setCreatedAt(LocalDateTime.now());
                        j.setUpdatedAt(LocalDateTime.now());
                        return j;
                    });

            ScheduledJobResponse result = scheduledJobService.createJob(request);

            assertThat(result.getModelId()).isEqualTo("gpt-5.2");
        }

        @Test
        @DisplayName("should default maxIterations to 10 when not specified")
        void shouldDefaultMaxIterations() {
            CreateScheduledJobRequest request = CreateScheduledJobRequest.builder()
                    .name(TEST_JOB_NAME)
                    .cronExpression(CRON_DAILY)
                    .promptTemplate(TEST_PROMPT)
                    .workspaceRef("repo")
                    .build();

            when(scheduledJobRepository.save(any(ScheduledJob.class)))
                    .thenAnswer(inv -> {
                        ScheduledJob j = inv.getArgument(0);
                        j.setId(UUID.randomUUID());
                        j.setCreatedAt(LocalDateTime.now());
                        j.setUpdatedAt(LocalDateTime.now());
                        return j;
                    });

            ScheduledJobResponse result = scheduledJobService.createJob(request);

            assertThat(result.getMaxIterations()).isEqualTo(10);
        }

        @Test
        @DisplayName("should throw IllegalArgumentException for invalid cron expression")
        void shouldThrowForInvalidCron() {
            CreateScheduledJobRequest invalidRequest = CreateScheduledJobRequest.builder()
                    .name("Bad Job")
                    .cronExpression("not-a-cron")
                    .promptTemplate("test")
                    .workspaceRef("repo")
                    .build();

            assertThatThrownBy(() -> scheduledJobService.createJob(invalidRequest))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Nested
    @DisplayName("getJob")
    class GetJob {

        @Test
        @DisplayName("should return job when found")
        void shouldReturnJobWhenFound() {
            when(scheduledJobRepository.findById(sampleJob.getId()))
                    .thenReturn(Optional.of(sampleJob));

            ScheduledJobResponse result = scheduledJobService.getJob(sampleJob.getId());

            assertThat(result.getName()).isEqualTo(JOB_NAME);
            assertThat(result.getId()).isEqualTo(sampleJob.getId());
        }

        @Test
        @DisplayName("should throw exception when job not found")
        void shouldThrowWhenNotFound() {
            UUID unknownId = UUID.randomUUID();
            when(scheduledJobRepository.findById(unknownId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> scheduledJobService.getJob(unknownId))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Scheduled job not found");
        }
    }

    @Nested
    @DisplayName("getAllJobs")
    class GetAllJobs {

        @Test
        @DisplayName("should return all enabled jobs ordered by next run")
        void shouldReturnAllEnabled() {
            when(scheduledJobRepository.findByEnabledTrueOrderByNextRunAtAsc())
                    .thenReturn(List.of(sampleJob));

            List<ScheduledJobResponse> result = scheduledJobService.getAllJobs();

            assertThat(result).hasSize(1);
            assertThat(result.getFirst().getName()).isEqualTo(JOB_NAME);
        }

        @Test
        @DisplayName("should return empty list when no enabled jobs")
        void shouldReturnEmptyWhenNone() {
            when(scheduledJobRepository.findByEnabledTrueOrderByNextRunAtAsc())
                    .thenReturn(List.of());

            List<ScheduledJobResponse> result = scheduledJobService.getAllJobs();

            assertThat(result).isEmpty();
        }
    }

    @Nested
    @DisplayName("getJobsByType")
    class GetJobsByType {

        @Test
        @DisplayName("should return jobs filtered by type")
        void shouldReturnByType() {
            when(scheduledJobRepository.findByJobType(ScheduledJobType.CODE_REVIEW))
                    .thenReturn(List.of(sampleJob));

            List<ScheduledJobResponse> result = scheduledJobService.getJobsByType(ScheduledJobType.CODE_REVIEW);

            assertThat(result).hasSize(1);
            assertThat(result.getFirst().getJobType()).isEqualTo(ScheduledJobType.CODE_REVIEW);
        }
    }

    @Nested
    @DisplayName("toggleJob")
    class ToggleJob {

        @Test
        @DisplayName("should disable an enabled job")
        void shouldDisableEnabled() {
            sampleJob.setEnabled(true);
            when(scheduledJobRepository.findById(sampleJob.getId()))
                    .thenReturn(Optional.of(sampleJob));
            when(scheduledJobRepository.save(any(ScheduledJob.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            ScheduledJobResponse result = scheduledJobService.toggleJob(sampleJob.getId());

            assertThat(result.getEnabled()).isFalse();
        }

        @Test
        @DisplayName("should enable a disabled job and recalculate nextRunAt")
        void shouldEnableAndRecalculate() {
            sampleJob.setEnabled(false);
            sampleJob.setNextRunAt(null);
            when(scheduledJobRepository.findById(sampleJob.getId()))
                    .thenReturn(Optional.of(sampleJob));
            when(scheduledJobRepository.save(any(ScheduledJob.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            ScheduledJobResponse result = scheduledJobService.toggleJob(sampleJob.getId());

            assertThat(result.getEnabled()).isTrue();
            assertThat(result.getNextRunAt()).isNotNull();
            assertThat(result.getNextRunAt()).isAfter(LocalDateTime.now());
        }

        @Test
        @DisplayName("should throw when job not found")
        void shouldThrowWhenNotFound() {
            UUID unknownId = UUID.randomUUID();
            when(scheduledJobRepository.findById(unknownId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> scheduledJobService.toggleJob(unknownId))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Nested
    @DisplayName("deleteJob")
    class DeleteJob {

        @Test
        @DisplayName("should delete job by ID")
        void shouldDeleteById() {
            doNothing().when(scheduledJobRepository).deleteById(sampleJob.getId());

            scheduledJobService.deleteJob(sampleJob.getId());

            verify(scheduledJobRepository).deleteById(sampleJob.getId());
        }
    }

    @Nested
    @DisplayName("executeDueJobs")
    class ExecuteDueJobs {

        @Test
        @DisplayName("should create tasks for all due jobs")
        void shouldCreateTasksForDueJobs() {
            when(scheduledJobRepository.findDueJobs(any(LocalDateTime.class)))
                    .thenReturn(List.of(sampleJob));

            TaskResponse taskResponse = TaskResponse.builder()
                    .id(UUID.randomUUID())
                    .title(SCHEDULED_TITLE)
                    .status(TaskStatus.PENDING)
                    .build();
            when(taskService.createTask(any(CreateTaskRequest.class)))
                    .thenReturn(taskResponse);
            when(scheduledJobRepository.save(any(ScheduledJob.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            scheduledJobService.executeDueJobs();

            ArgumentCaptor<CreateTaskRequest> captor = ArgumentCaptor.forClass(CreateTaskRequest.class);
            verify(taskService).createTask(captor.capture());

            CreateTaskRequest createdRequest = captor.getValue();
            assertThat(createdRequest.getTitle()).isEqualTo(SCHEDULED_TITLE);
            assertThat(createdRequest.getPrompt()).isEqualTo(PROMPT);
            assertThat(createdRequest.getRepositorySlug()).isEqualTo(REPO_SLUG);
            assertThat(createdRequest.getIterative()).isTrue();
            assertThat(createdRequest.getMaxIterations()).isEqualTo(10);
        }

        @Test
        @DisplayName("should update job metadata after execution")
        void shouldUpdateJobMetadata() {
            when(scheduledJobRepository.findDueJobs(any(LocalDateTime.class)))
                    .thenReturn(List.of(sampleJob));

            UUID taskId = UUID.randomUUID();
            TaskResponse taskResponse = TaskResponse.builder()
                    .id(taskId)
                    .title(SCHEDULED_TITLE)
                    .status(TaskStatus.PENDING)
                    .build();
            when(taskService.createTask(any(CreateTaskRequest.class)))
                    .thenReturn(taskResponse);
            when(scheduledJobRepository.save(any(ScheduledJob.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            scheduledJobService.executeDueJobs();

            assertThat(sampleJob.getLastRunAt()).isNotNull();
            assertThat(sampleJob.getLastTaskId()).isEqualTo(taskId);
            assertThat(sampleJob.getNextRunAt()).isAfter(LocalDateTime.now());

            verify(scheduledJobRepository).save(sampleJob);
        }

        @Test
        @DisplayName("should continue processing when one job fails")
        void shouldContinueOnFailure() {
            ScheduledJob failingJob = ScheduledJob.builder()
                    .id(UUID.randomUUID())
                    .name("Failing Job")
                    .cronExpression(CRON_DAILY)
                    .promptTemplate("test")
                    .workspaceRef("repo")
                    .jobType(ScheduledJobType.MAINTENANCE)
                    .workspaceType(WorkspaceType.BITBUCKET)
                    .maxIterations(10)
                    .build();

            ScheduledJob successJob = ScheduledJob.builder()
                    .id(UUID.randomUUID())
                    .name("Success Job")
                    .cronExpression("0 0 3 * * *")
                    .promptTemplate("test2")
                    .workspaceRef("repo2")
                    .jobType(ScheduledJobType.MAINTENANCE)
                    .workspaceType(WorkspaceType.BITBUCKET)
                    .maxIterations(10)
                    .build();

            when(scheduledJobRepository.findDueJobs(any(LocalDateTime.class)))
                    .thenReturn(List.of(failingJob, successJob));

            when(taskService.createTask(any(CreateTaskRequest.class)))
                    .thenThrow(new RuntimeException("First job fails"))
                    .thenReturn(TaskResponse.builder()
                            .id(UUID.randomUUID())
                            .title("Success")
                            .status(TaskStatus.PENDING)
                            .build());

            when(scheduledJobRepository.save(any(ScheduledJob.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            // Should not throw
            scheduledJobService.executeDueJobs();

            // TaskService was called twice (once failed, once succeeded)
            verify(taskService, times(2)).createTask(any());
        }

        @Test
        @DisplayName("should not create any tasks when no jobs are due")
        void shouldDoNothingWhenNoDueJobs() {
            when(scheduledJobRepository.findDueJobs(any(LocalDateTime.class)))
                    .thenReturn(List.of());

            scheduledJobService.executeDueJobs();

            verify(taskService, never()).createTask(any());
        }
    }
}
