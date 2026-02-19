package com.promptdev.service;

import com.promptdev.dto.TaskResponse;
import com.promptdev.entity.*;
import com.promptdev.mapper.TaskMapper;
import com.promptdev.repository.TaskEventRepository;
import com.promptdev.repository.TaskRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Tests for task cloning (used by the retry flow).
 */
@ExtendWith(MockitoExtension.class)
class TaskServiceCloneTest {

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private TaskEventRepository taskEventRepository;

    @Mock
    private TaskMapper taskMapper;

    @Mock
    private SseService sseService;

    @Mock
    private BitbucketService bitbucketService;

    @InjectMocks
    private TaskService taskService;

    private UUID originalId;
    private Task originalTask;

    @BeforeEach
    void setUp() {
        originalId = UUID.randomUUID();
        originalTask = Task.builder()
                .id(originalId)
                .title("Original task")
                .prompt("Fix the bug in parser.ts")
                .repositorySlug("my-repo")
                .projectKey("PROJ")
                .workspaceType(WorkspaceType.BITBUCKET)
                .sourceBranch("promptdev/" + originalId)
                .targetBranch("main")
                .modelId("gpt-5.2")
                .status(TaskStatus.FAILED)
                .currentAttempt(3)
                .maxAttempts(3)
                .iterative(true)
                .maxIterations(5)
                .currentIteration(2)
                .completionCriteria("All tests pass")
                .steps("[\"step1\",\"step2\"]")
                .currentStepIndex(1)
                .jiraIssueKey("PROJ-123")
                .reviewEnabled(true)
                .reviewModelId("gpt-4o")
                .commitMessagePattern("[PROJ-123] {message}")
                .bootScript("npm install")
                .skills("[\"typescript\"]")
                .additionalRepositories("[\"other-repo\"]")
                .systemPrompt("You are a helpful dev")
                .environmentVariablesEncrypted("encrypted-vars")
                .events(new ArrayList<>())
                .build();
    }

    @Nested
    @DisplayName("cloneTask — Bitbucket workspace")
    class CloneTaskBitbucket {

        @Test
        @DisplayName("should create a new task with PENDING status and zero attempts")
        void shouldCreateFreshTask() {
            when(taskRepository.findById(originalId)).thenReturn(Optional.of(originalTask));
            when(taskRepository.save(any(Task.class))).thenAnswer(inv -> {
                Task t = inv.getArgument(0);
                if (t.getId() == null) t.setId(UUID.randomUUID());
                return t;
            });
            when(taskMapper.toResponse(any(Task.class))).thenReturn(TaskResponse.builder().build());

            taskService.cloneTask(originalId);

            ArgumentCaptor<Task> captor = ArgumentCaptor.forClass(Task.class);
            // save called twice: once for initial save, once for branch update
            verify(taskRepository, atLeastOnce()).save(captor.capture());

            Task clone = captor.getAllValues().get(0);
            assertThat(clone.getStatus()).isEqualTo(TaskStatus.PENDING);
            assertThat(clone.getCurrentAttempt()).isEqualTo(0);
            assertThat(clone.getCurrentIteration()).isEqualTo(0);
            assertThat(clone.getCurrentStepIndex()).isEqualTo(0);
            assertThat(clone.getErrorMessage()).isNull();
            assertThat(clone.getCopilotSessionId()).isNull();
            assertThat(clone.getPullRequestId()).isNull();
            assertThat(clone.getPullRequestUrl()).isNull();
        }

        @Test
        @DisplayName("should copy all task configuration fields")
        void shouldCopyConfiguration() {
            when(taskRepository.findById(originalId)).thenReturn(Optional.of(originalTask));
            when(taskRepository.save(any(Task.class))).thenAnswer(inv -> {
                Task t = inv.getArgument(0);
                if (t.getId() == null) t.setId(UUID.randomUUID());
                return t;
            });
            when(taskMapper.toResponse(any(Task.class))).thenReturn(TaskResponse.builder().build());

            taskService.cloneTask(originalId);

            ArgumentCaptor<Task> captor = ArgumentCaptor.forClass(Task.class);
            verify(taskRepository, atLeastOnce()).save(captor.capture());

            Task clone = captor.getAllValues().get(0);
            assertThat(clone.getTitle()).isEqualTo("Original task");
            assertThat(clone.getPrompt()).isEqualTo("Fix the bug in parser.ts");
            assertThat(clone.getRepositorySlug()).isEqualTo("my-repo");
            assertThat(clone.getProjectKey()).isEqualTo("PROJ");
            assertThat(clone.getModelId()).isEqualTo("gpt-5.2");
            assertThat(clone.getMaxAttempts()).isEqualTo(3);
            assertThat(clone.getIterative()).isTrue();
            assertThat(clone.getMaxIterations()).isEqualTo(5);
            assertThat(clone.getCompletionCriteria()).isEqualTo("All tests pass");
            assertThat(clone.getSteps()).isEqualTo("[\"step1\",\"step2\"]");
            assertThat(clone.getJiraIssueKey()).isEqualTo("PROJ-123");
            assertThat(clone.getReviewEnabled()).isTrue();
            assertThat(clone.getReviewModelId()).isEqualTo("gpt-4o");
            assertThat(clone.getCommitMessagePattern()).isEqualTo("[PROJ-123] {message}");
            assertThat(clone.getBootScript()).isEqualTo("npm install");
            assertThat(clone.getSkills()).isEqualTo("[\"typescript\"]");
            assertThat(clone.getAdditionalRepositories()).isEqualTo("[\"other-repo\"]");
            assertThat(clone.getSystemPrompt()).isEqualTo("You are a helpful dev");
            assertThat(clone.getEnvironmentVariablesEncrypted()).isEqualTo("encrypted-vars");
        }

        @Test
        @DisplayName("should set source branch to __AUTO_GENERATED__ for Bitbucket tasks")
        void shouldAutoGenerateBranchForBitbucket() {
            when(taskRepository.findById(originalId)).thenReturn(Optional.of(originalTask));
            when(taskRepository.save(any(Task.class))).thenAnswer(inv -> {
                Task t = inv.getArgument(0);
                if (t.getId() == null) t.setId(UUID.randomUUID());
                return t;
            });
            when(taskMapper.toResponse(any(Task.class))).thenReturn(TaskResponse.builder().build());

            taskService.cloneTask(originalId);

            // The first save should have __AUTO_GENERATED__ as source branch
            ArgumentCaptor<Task> captor = ArgumentCaptor.forClass(Task.class);
            verify(taskRepository, atLeastOnce()).save(captor.capture());

            // After branch creation, the branch should be set to promptdev/{newId}
            Task finalClone = captor.getAllValues().get(captor.getAllValues().size() - 1);
            assertThat(finalClone.getSourceBranch()).startsWith("promptdev/");
            assertThat(finalClone.getSourceBranch()).isNotEqualTo(originalTask.getSourceBranch());
        }

        @Test
        @DisplayName("should call Bitbucket createBranch for auto-generated branch")
        void shouldCallCreateBranch() {
            when(taskRepository.findById(originalId)).thenReturn(Optional.of(originalTask));
            when(taskRepository.save(any(Task.class))).thenAnswer(inv -> {
                Task t = inv.getArgument(0);
                if (t.getId() == null) t.setId(UUID.randomUUID());
                return t;
            });
            when(taskMapper.toResponse(any(Task.class))).thenReturn(TaskResponse.builder().build());

            taskService.cloneTask(originalId);

            verify(bitbucketService).createBranch(
                    eq("PROJ"),
                    eq("my-repo"),
                    argThat(branch -> branch.startsWith("promptdev/")),
                    eq("main")
            );
        }

        @Test
        @DisplayName("should create TASK_CREATED event with clone reference")
        void shouldCreateEventWithCloneReference() {
            when(taskRepository.findById(originalId)).thenReturn(Optional.of(originalTask));
            when(taskRepository.save(any(Task.class))).thenAnswer(inv -> {
                Task t = inv.getArgument(0);
                if (t.getId() == null) t.setId(UUID.randomUUID());
                return t;
            });
            when(taskMapper.toResponse(any(Task.class))).thenReturn(TaskResponse.builder().build());

            taskService.cloneTask(originalId);

            ArgumentCaptor<TaskEvent> eventCaptor = ArgumentCaptor.forClass(TaskEvent.class);
            verify(taskEventRepository).save(eventCaptor.capture());

            TaskEvent event = eventCaptor.getValue();
            assertThat(event.getEventType()).isEqualTo(EventType.TASK_CREATED);
            assertThat(event.getMessage()).contains(originalId.toString());
        }

        @Test
        @DisplayName("should broadcast SSE update for cloned task")
        void shouldBroadcastSse() {
            TaskResponse response = TaskResponse.builder().build();
            when(taskRepository.findById(originalId)).thenReturn(Optional.of(originalTask));
            when(taskRepository.save(any(Task.class))).thenAnswer(inv -> {
                Task t = inv.getArgument(0);
                if (t.getId() == null) t.setId(UUID.randomUUID());
                return t;
            });
            when(taskMapper.toResponse(any(Task.class))).thenReturn(response);

            taskService.cloneTask(originalId);

            verify(sseService).broadcastTaskUpdate(response);
        }

        @Test
        @DisplayName("should throw when original task not found")
        void shouldThrowWhenNotFound() {
            UUID unknownId = UUID.randomUUID();
            when(taskRepository.findById(unknownId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> taskService.cloneTask(unknownId))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Task not found");
        }
    }

    @Nested
    @DisplayName("cloneTask — LOCAL workspace with existing project")
    class CloneTaskLocalExistingProject {

        @Test
        @DisplayName("should keep the same workspace path for existing projects (git worktree handles isolation)")
        void shouldKeepSameWorkspacePath() {
            originalTask.setWorkspaceType(WorkspaceType.LOCAL);
            originalTask.setWorkspacePath("/Users/me/my-project");
            originalTask.setRepositorySlug("/Users/me/my-project");

            when(taskRepository.findById(originalId)).thenReturn(Optional.of(originalTask));
            when(taskRepository.save(any(Task.class))).thenAnswer(inv -> {
                Task t = inv.getArgument(0);
                if (t.getId() == null) t.setId(UUID.randomUUID());
                return t;
            });
            when(taskMapper.toResponse(any(Task.class))).thenReturn(TaskResponse.builder().build());

            taskService.cloneTask(originalId);

            ArgumentCaptor<Task> captor = ArgumentCaptor.forClass(Task.class);
            verify(taskRepository, atLeastOnce()).save(captor.capture());

            Task clone = captor.getAllValues().get(0);
            assertThat(clone.getWorkspacePath()).isEqualTo("/Users/me/my-project");
        }

        @Test
        @DisplayName("should keep the original source branch for LOCAL tasks")
        void shouldKeepSourceBranch() {
            originalTask.setWorkspaceType(WorkspaceType.LOCAL);
            originalTask.setWorkspacePath("/Users/me/my-project");
            originalTask.setRepositorySlug("/Users/me/my-project");
            originalTask.setSourceBranch("feature/my-branch");

            when(taskRepository.findById(originalId)).thenReturn(Optional.of(originalTask));
            when(taskRepository.save(any(Task.class))).thenAnswer(inv -> {
                Task t = inv.getArgument(0);
                if (t.getId() == null) t.setId(UUID.randomUUID());
                return t;
            });
            when(taskMapper.toResponse(any(Task.class))).thenReturn(TaskResponse.builder().build());

            taskService.cloneTask(originalId);

            ArgumentCaptor<Task> captor = ArgumentCaptor.forClass(Task.class);
            verify(taskRepository, atLeastOnce()).save(captor.capture());

            Task clone = captor.getAllValues().get(0);
            assertThat(clone.getSourceBranch()).isEqualTo("feature/my-branch");
        }

        @Test
        @DisplayName("should NOT call Bitbucket createBranch for LOCAL tasks")
        void shouldNotCallBitbucket() {
            originalTask.setWorkspaceType(WorkspaceType.LOCAL);
            originalTask.setWorkspacePath("/Users/me/my-project");
            originalTask.setRepositorySlug("/Users/me/my-project");

            when(taskRepository.findById(originalId)).thenReturn(Optional.of(originalTask));
            when(taskRepository.save(any(Task.class))).thenAnswer(inv -> {
                Task t = inv.getArgument(0);
                if (t.getId() == null) t.setId(UUID.randomUUID());
                return t;
            });
            when(taskMapper.toResponse(any(Task.class))).thenReturn(TaskResponse.builder().build());

            taskService.cloneTask(originalId);

            verify(bitbucketService, never()).createBranch(any(), any(), any(), any());
        }
    }

    @Nested
    @DisplayName("cloneTask — LOCAL workspace with new project")
    class CloneTaskLocalNewProject {

        @Test
        @DisplayName("should increment workspace path when directory exists")
        void shouldIncrementWorkspacePathWhenExists(@TempDir Path tempDir) throws IOException {
            // Create the original directory so it "exists"
            Path projectDir = tempDir.resolve("my-project");
            Files.createDirectories(projectDir);

            originalTask.setWorkspaceType(WorkspaceType.LOCAL);
            originalTask.setWorkspacePath(projectDir.toString());
            originalTask.setRepositorySlug("my-project"); // different from workspacePath → new project

            when(taskRepository.findById(originalId)).thenReturn(Optional.of(originalTask));
            when(taskRepository.save(any(Task.class))).thenAnswer(inv -> {
                Task t = inv.getArgument(0);
                if (t.getId() == null) t.setId(UUID.randomUUID());
                return t;
            });
            when(taskMapper.toResponse(any(Task.class))).thenReturn(TaskResponse.builder().build());

            taskService.cloneTask(originalId);

            ArgumentCaptor<Task> captor = ArgumentCaptor.forClass(Task.class);
            verify(taskRepository, atLeastOnce()).save(captor.capture());

            Task clone = captor.getAllValues().get(0);
            assertThat(clone.getWorkspacePath()).isEqualTo(tempDir.resolve("my-project-1").toString());
        }

        @Test
        @DisplayName("should keep workspace path unchanged when directory does not exist")
        void shouldKeepPathWhenNotExists() {
            originalTask.setWorkspaceType(WorkspaceType.LOCAL);
            originalTask.setWorkspacePath("/nonexistent/path/my-project");
            originalTask.setRepositorySlug("my-project");

            when(taskRepository.findById(originalId)).thenReturn(Optional.of(originalTask));
            when(taskRepository.save(any(Task.class))).thenAnswer(inv -> {
                Task t = inv.getArgument(0);
                if (t.getId() == null) t.setId(UUID.randomUUID());
                return t;
            });
            when(taskMapper.toResponse(any(Task.class))).thenReturn(TaskResponse.builder().build());

            taskService.cloneTask(originalId);

            ArgumentCaptor<Task> captor = ArgumentCaptor.forClass(Task.class);
            verify(taskRepository, atLeastOnce()).save(captor.capture());

            Task clone = captor.getAllValues().get(0);
            assertThat(clone.getWorkspacePath()).isEqualTo("/nonexistent/path/my-project");
        }
    }

    @Nested
    @DisplayName("resolveIncrementedPath")
    class ResolveIncrementedPath {

        @Test
        @DisplayName("should return base path when it does not exist")
        void shouldReturnBaseWhenNotExists() {
            String result = TaskService.resolveIncrementedPath("/nonexistent/my-project");
            assertThat(result).isEqualTo("/nonexistent/my-project");
        }

        @Test
        @DisplayName("should return base-1 when base exists")
        void shouldReturnBase1WhenBaseExists(@TempDir Path tempDir) throws IOException {
            Path project = tempDir.resolve("my-project");
            Files.createDirectories(project);

            String result = TaskService.resolveIncrementedPath(project.toString());
            assertThat(result).isEqualTo(tempDir.resolve("my-project-1").toString());
        }

        @Test
        @DisplayName("should skip to base-2 when base and base-1 exist")
        void shouldSkipToBase2(@TempDir Path tempDir) throws IOException {
            Files.createDirectories(tempDir.resolve("my-project"));
            Files.createDirectories(tempDir.resolve("my-project-1"));

            String result = TaskService.resolveIncrementedPath(tempDir.resolve("my-project").toString());
            assertThat(result).isEqualTo(tempDir.resolve("my-project-2").toString());
        }

        @Test
        @DisplayName("should handle already-suffixed paths")
        void shouldHandleAlreadySuffixed(@TempDir Path tempDir) throws IOException {
            Files.createDirectories(tempDir.resolve("my-project-1"));

            String result = TaskService.resolveIncrementedPath(tempDir.resolve("my-project-1").toString());
            assertThat(result).isEqualTo(tempDir.resolve("my-project-2").toString());
        }

        @Test
        @DisplayName("should skip over multiple existing suffixed directories")
        void shouldSkipMultiple(@TempDir Path tempDir) throws IOException {
            Files.createDirectories(tempDir.resolve("my-project"));
            Files.createDirectories(tempDir.resolve("my-project-1"));
            Files.createDirectories(tempDir.resolve("my-project-2"));
            Files.createDirectories(tempDir.resolve("my-project-3"));

            String result = TaskService.resolveIncrementedPath(tempDir.resolve("my-project").toString());
            assertThat(result).isEqualTo(tempDir.resolve("my-project-4").toString());
        }
    }
}
