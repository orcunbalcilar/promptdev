package com.promptdev.mapper;

import com.promptdev.dto.TaskEventResponse;
import com.promptdev.dto.TaskResponse;
import com.promptdev.entity.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class TaskMapperTest {

    private TaskMapper taskMapper;

    @BeforeEach
    void setUp() {
        taskMapper = new TaskMapper();
    }

    private Task createFullTask() {
        return Task.builder()
                .id(UUID.randomUUID())
                .title("Full task")
                .prompt("Do something")
                .repositorySlug("my-repo")
                .workspaceType(WorkspaceType.BITBUCKET)
                .workspacePath("/tmp/workspace")
                .sourceBranch("feature/test")
                .targetBranch("main")
                .status(TaskStatus.COMPLETED)
                .currentAttempt(2)
                .maxAttempts(3)
                .modelId("gpt-5.2")
                .copilotSessionId("session-123")
                .pullRequestId(42)
                .pullRequestUrl("https://bitbucket.com/pr/42")
                .errorMessage(null)
                .iterative(true)
                .maxIterations(5)
                .currentIteration(3)
                .currentStepIndex(1)
                .completionCriteria("All tests pass")
                .steps("[\"step1\",\"step2\"]")
                .scheduledJobId(UUID.randomUUID())
                .jiraIssueKey("PROJ-123")
                .reviewEnabled(true)
                .reviewModelId("claude-opus-4")
                .resumePrompt("Fix the CSS issue")
                .resumeCount(2)
                .commitMessagePattern("[PROJ-123] {message}")
                .bootScript("npm install")
                .skills("[\"frontend\",\"testing\"]")
                .additionalRepositories("[\"common-lib\",\"shared-utils\"]")
                .createdAt(LocalDateTime.of(2025, 1, 15, 10, 30))
                .updatedAt(LocalDateTime.of(2025, 1, 15, 11, 0))
                .completedAt(LocalDateTime.of(2025, 1, 15, 11, 30))
                .events(new ArrayList<>())
                .build();
    }

    @Nested
    @DisplayName("toResponse")
    class ToResponse {

        @Test
        @DisplayName("should map all basic fields correctly")
        void shouldMapBasicFields() {
            Task task = createFullTask();

            TaskResponse response = taskMapper.toResponse(task);

            assertThat(response.getId()).isEqualTo(task.getId());
            assertThat(response.getTitle()).isEqualTo("Full task");
            assertThat(response.getPrompt()).isEqualTo("Do something");
            assertThat(response.getRepositorySlug()).isEqualTo("my-repo");
            assertThat(response.getWorkspaceType()).isEqualTo(WorkspaceType.BITBUCKET);
            assertThat(response.getWorkspacePath()).isEqualTo("/tmp/workspace");
            assertThat(response.getSourceBranch()).isEqualTo("feature/test");
            assertThat(response.getTargetBranch()).isEqualTo("main");
            assertThat(response.getStatus()).isEqualTo(TaskStatus.COMPLETED);
            assertThat(response.getCurrentAttempt()).isEqualTo(2);
            assertThat(response.getMaxAttempts()).isEqualTo(3);
            assertThat(response.getModelId()).isEqualTo("gpt-5.2");
            assertThat(response.getCopilotSessionId()).isEqualTo("session-123");
            assertThat(response.getPullRequestId()).isEqualTo(42);
            assertThat(response.getPullRequestUrl()).isEqualTo("https://bitbucket.com/pr/42");
        }

        @Test
        @DisplayName("should map iterative session fields")
        void shouldMapIterativeFields() {
            Task task = createFullTask();

            TaskResponse response = taskMapper.toResponse(task);

            assertThat(response.getIterative()).isTrue();
            assertThat(response.getMaxIterations()).isEqualTo(5);
            assertThat(response.getCurrentIteration()).isEqualTo(3);
            assertThat(response.getCurrentStepIndex()).isEqualTo(1);
            assertThat(response.getCompletionCriteria()).isEqualTo("All tests pass");
            assertThat(response.getSteps()).isEqualTo("[\"step1\",\"step2\"]");
            assertThat(response.getScheduledJobId()).isEqualTo(task.getScheduledJobId());
        }

        @Test
        @DisplayName("should map jiraIssueKey field")
        void shouldMapJiraIssueKey() {
            Task task = createFullTask();

            TaskResponse response = taskMapper.toResponse(task);

            assertThat(response.getJiraIssueKey()).isEqualTo("PROJ-123");
        }

        @Test
        @DisplayName("should map reviewEnabled field")
        void shouldMapReviewEnabled() {
            Task task = createFullTask();

            TaskResponse response = taskMapper.toResponse(task);

            assertThat(response.getReviewEnabled()).isTrue();
        }

        @Test
        @DisplayName("should map reviewModelId field")
        void shouldMapReviewModelId() {
            Task task = createFullTask();

            TaskResponse response = taskMapper.toResponse(task);

            assertThat(response.getReviewModelId()).isEqualTo("claude-opus-4");
        }

        @Test
        @DisplayName("should map resumePrompt field")
        void shouldMapResumePrompt() {
            Task task = createFullTask();

            TaskResponse response = taskMapper.toResponse(task);

            assertThat(response.getResumePrompt()).isEqualTo("Fix the CSS issue");
        }

        @Test
        @DisplayName("should map resumeCount field")
        void shouldMapResumeCount() {
            Task task = createFullTask();

            TaskResponse response = taskMapper.toResponse(task);

            assertThat(response.getResumeCount()).isEqualTo(2);
        }

        @Test
        @DisplayName("should map commitMessagePattern field")
        void shouldMapCommitMessagePattern() {
            Task task = createFullTask();

            TaskResponse response = taskMapper.toResponse(task);

            assertThat(response.getCommitMessagePattern()).isEqualTo("[PROJ-123] {message}");
        }

        @Test
        @DisplayName("should map skills field")
        void shouldMapSkills() {
            Task task = createFullTask();

            TaskResponse response = taskMapper.toResponse(task);

            assertThat(response.getSkills()).isEqualTo("[\"frontend\",\"testing\"]");
        }

        @Test
        @DisplayName("should map additionalRepositories field")
        void shouldMapAdditionalRepositories() {
            Task task = createFullTask();

            TaskResponse response = taskMapper.toResponse(task);

            assertThat(response.getAdditionalRepositories()).isEqualTo("[\"common-lib\",\"shared-utils\"]");
        }

        @Test
        @DisplayName("should map bootScript field")
        void shouldMapBootScript() {
            Task task = createFullTask();

            TaskResponse response = taskMapper.toResponse(task);

            assertThat(response.getBootScript()).isEqualTo("npm install");
        }

        @Test
        @DisplayName("should map timestamp fields")
        void shouldMapTimestamps() {
            Task task = createFullTask();

            TaskResponse response = taskMapper.toResponse(task);

            assertThat(response.getCreatedAt()).isEqualTo(LocalDateTime.of(2025, 1, 15, 10, 30));
            assertThat(response.getUpdatedAt()).isEqualTo(LocalDateTime.of(2025, 1, 15, 11, 0));
            assertThat(response.getCompletedAt()).isEqualTo(LocalDateTime.of(2025, 1, 15, 11, 30));
        }

        @Test
        @DisplayName("should include events list")
        void shouldIncludeEvents() {
            Task task = createFullTask();

            TaskResponse response = taskMapper.toResponse(task);

            assertThat(response.getEvents()).isNotNull();
            assertThat(response.getEvents()).isEmpty();
        }

        @Test
        @DisplayName("should handle null optional fields")
        void shouldHandleNullFields() {
            Task task = Task.builder()
                    .id(UUID.randomUUID())
                    .title("Minimal task")
                    .prompt("Do something")
                    .repositorySlug("repo")
                    .status(TaskStatus.PENDING)
                    .events(new ArrayList<>())
                    .build();

            TaskResponse response = taskMapper.toResponse(task);

            assertThat(response.getJiraIssueKey()).isNull();
            assertThat(response.getReviewModelId()).isNull();
            assertThat(response.getResumePrompt()).isNull();
            assertThat(response.getCommitMessagePattern()).isNull();
            assertThat(response.getSkills()).isNull();
            assertThat(response.getAdditionalRepositories()).isNull();
            assertThat(response.getBootScript()).isNull();
            assertThat(response.getCompletedAt()).isNull();
            assertThat(response.getErrorMessage()).isNull();
        }
    }

    @Nested
    @DisplayName("toResponseWithoutEvents")
    class ToResponseWithoutEvents {

        @Test
        @DisplayName("should map all fields but events should be null")
        void shouldOmitEvents() {
            Task task = createFullTask();

            TaskResponse response = taskMapper.toResponseWithoutEvents(task);

            assertThat(response.getId()).isEqualTo(task.getId());
            assertThat(response.getTitle()).isEqualTo("Full task");
            assertThat(response.getJiraIssueKey()).isEqualTo("PROJ-123");
            assertThat(response.getReviewEnabled()).isTrue();
            assertThat(response.getResumeCount()).isEqualTo(2);
            assertThat(response.getSkills()).isEqualTo("[\"frontend\",\"testing\"]");
            assertThat(response.getEvents()).isNull();
        }
    }

    @Nested
    @DisplayName("toEventResponse")
    class ToEventResponse {

        @Test
        @DisplayName("should map task event to response DTO")
        void shouldMapTaskEvent() {
            TaskEvent event = TaskEvent.builder()
                    .id(UUID.randomUUID())
                    .eventType(EventType.TASK_QUEUED)
                    .message("Session resumed")
                    .details("Some details")
                    .codeSnippet("System.out.println(\"hello\")")
                    .filePath("src/Main.java")
                    .timestamp(LocalDateTime.of(2025, 1, 15, 12, 0))
                    .build();

            TaskEventResponse response = taskMapper.toEventResponse(event);

            assertThat(response.getId()).isEqualTo(event.getId());
            assertThat(response.getEventType()).isEqualTo(EventType.TASK_QUEUED);
            assertThat(response.getMessage()).isEqualTo("Session resumed");
            assertThat(response.getDetails()).isEqualTo("Some details");
            assertThat(response.getCodeSnippet()).isEqualTo("System.out.println(\"hello\")");
            assertThat(response.getFilePath()).isEqualTo("src/Main.java");
            assertThat(response.getTimestamp()).isEqualTo(LocalDateTime.of(2025, 1, 15, 12, 0));
        }
    }

    @Nested
    @DisplayName("toEventResponses")
    class ToEventResponses {

        @Test
        @DisplayName("should map list of events")
        void shouldMapEventList() {
            TaskEvent event1 = TaskEvent.builder()
                    .id(UUID.randomUUID())
                    .eventType(EventType.TASK_CREATED)
                    .message("Created")
                    .timestamp(LocalDateTime.now())
                    .build();
            TaskEvent event2 = TaskEvent.builder()
                    .id(UUID.randomUUID())
                    .eventType(EventType.TASK_COMPLETED)
                    .message("Done")
                    .timestamp(LocalDateTime.now())
                    .build();

            List<TaskEventResponse> responses = taskMapper.toEventResponses(List.of(event1, event2));

            assertThat(responses).hasSize(2);
            assertThat(responses.get(0).getEventType()).isEqualTo(EventType.TASK_CREATED);
            assertThat(responses.get(1).getEventType()).isEqualTo(EventType.TASK_COMPLETED);
        }

        @Test
        @DisplayName("should return empty list for null input")
        void shouldReturnEmptyForNull() {
            List<TaskEventResponse> responses = taskMapper.toEventResponses(null);

            assertThat(responses).isEmpty();
        }

        @Test
        @DisplayName("should return empty list for empty input")
        void shouldReturnEmptyForEmptyList() {
            List<TaskEventResponse> responses = taskMapper.toEventResponses(List.of());

            assertThat(responses).isEmpty();
        }
    }
}
