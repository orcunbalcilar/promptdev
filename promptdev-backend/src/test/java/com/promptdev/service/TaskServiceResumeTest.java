package com.promptdev.service;

import com.promptdev.config.BitbucketConfig;
import com.promptdev.dto.TaskEventResponse;
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
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TaskServiceResumeTest {

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

    @Mock
    private BitbucketConfig bitbucketConfig;

    @InjectMocks
    private TaskService taskService;

    private Task createCompletedTask() {
        return Task.builder()
                .id(UUID.randomUUID())
                .title("Completed task")
                .prompt("Original prompt")
                .repositorySlug("my-repo")
                .status(TaskStatus.COMPLETED)
                .resumeCount(0)
                .completedAt(LocalDateTime.now())
                .events(new ArrayList<>())
                .build();
    }

    private Task createFailedTask() {
        return Task.builder()
                .id(UUID.randomUUID())
                .title("Failed task")
                .prompt("Original prompt")
                .repositorySlug("my-repo")
                .status(TaskStatus.FAILED)
                .resumeCount(0)
                .errorMessage("Something went wrong")
                .events(new ArrayList<>())
                .build();
    }

    private Task createInProgressTask() {
        return Task.builder()
                .id(UUID.randomUUID())
                .title("In-progress task")
                .prompt("Original prompt")
                .repositorySlug("my-repo")
                .status(TaskStatus.IN_PROGRESS)
                .resumeCount(0)
                .events(new ArrayList<>())
                .build();
    }

    @Nested
    @DisplayName("resumeTask - successful resume")
    class ResumeTaskSuccess {

        @Test
        @DisplayName("should change status to PENDING when resuming completed task")
        void shouldChangeStatusToPending() {
            Task task = createCompletedTask();
            when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
            when(taskRepository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));
            when(taskEventRepository.save(any(TaskEvent.class))).thenAnswer(inv -> inv.getArgument(0));
            when(taskMapper.toResponse(any(Task.class))).thenReturn(TaskResponse.builder().build());
            when(taskMapper.toEventResponse(any(TaskEvent.class))).thenReturn(TaskEventResponse.builder().build());

            taskService.resumeTask(task.getId(), "Fix the CSS styling");

            ArgumentCaptor<Task> captor = ArgumentCaptor.forClass(Task.class);
            verify(taskRepository).save(captor.capture());

            Task saved = captor.getValue();
            assertThat(saved.getStatus()).isEqualTo(TaskStatus.PENDING);
        }

        @Test
        @DisplayName("should set resumePrompt on the task")
        void shouldSetResumePrompt() {
            Task task = createCompletedTask();
            when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
            when(taskRepository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));
            when(taskEventRepository.save(any(TaskEvent.class))).thenAnswer(inv -> inv.getArgument(0));
            when(taskMapper.toResponse(any(Task.class))).thenReturn(TaskResponse.builder().build());
            when(taskMapper.toEventResponse(any(TaskEvent.class))).thenReturn(TaskEventResponse.builder().build());

            taskService.resumeTask(task.getId(), "Add unit tests for the new feature");

            ArgumentCaptor<Task> captor = ArgumentCaptor.forClass(Task.class);
            verify(taskRepository).save(captor.capture());

            Task saved = captor.getValue();
            assertThat(saved.getResumePrompt()).isEqualTo("Add unit tests for the new feature");
        }

        @Test
        @DisplayName("should increment resumeCount by 1")
        void shouldIncrementResumeCount() {
            Task task = createCompletedTask();
            when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
            when(taskRepository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));
            when(taskEventRepository.save(any(TaskEvent.class))).thenAnswer(inv -> inv.getArgument(0));
            when(taskMapper.toResponse(any(Task.class))).thenReturn(TaskResponse.builder().build());
            when(taskMapper.toEventResponse(any(TaskEvent.class))).thenReturn(TaskEventResponse.builder().build());

            taskService.resumeTask(task.getId(), "Resume prompt");

            ArgumentCaptor<Task> captor = ArgumentCaptor.forClass(Task.class);
            verify(taskRepository).save(captor.capture());

            Task saved = captor.getValue();
            assertThat(saved.getResumeCount()).isEqualTo(1);
        }

        @Test
        @DisplayName("should create TASK_QUEUED event")
        void shouldCreateTaskQueuedEvent() {
            Task task = createCompletedTask();
            when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
            when(taskRepository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));
            when(taskEventRepository.save(any(TaskEvent.class))).thenAnswer(inv -> inv.getArgument(0));
            when(taskMapper.toResponse(any(Task.class))).thenReturn(TaskResponse.builder().build());
            when(taskMapper.toEventResponse(any(TaskEvent.class))).thenReturn(TaskEventResponse.builder().build());

            taskService.resumeTask(task.getId(), "Resume prompt");

            ArgumentCaptor<TaskEvent> eventCaptor = ArgumentCaptor.forClass(TaskEvent.class);
            verify(taskEventRepository).save(eventCaptor.capture());

            TaskEvent event = eventCaptor.getValue();
            assertThat(event.getEventType()).isEqualTo(EventType.TASK_QUEUED);
            assertThat(event.getMessage()).contains("Session resumed");
            assertThat(event.getMessage()).contains("Resume prompt");
        }

        @Test
        @DisplayName("should clear errorMessage on resume")
        void shouldClearErrorMessage() {
            Task task = createFailedTask();
            when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
            when(taskRepository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));
            when(taskEventRepository.save(any(TaskEvent.class))).thenAnswer(inv -> inv.getArgument(0));
            when(taskMapper.toResponse(any(Task.class))).thenReturn(TaskResponse.builder().build());
            when(taskMapper.toEventResponse(any(TaskEvent.class))).thenReturn(TaskEventResponse.builder().build());

            taskService.resumeTask(task.getId(), "Try again");

            ArgumentCaptor<Task> captor = ArgumentCaptor.forClass(Task.class);
            verify(taskRepository).save(captor.capture());

            Task saved = captor.getValue();
            assertThat(saved.getErrorMessage()).isNull();
        }

        @Test
        @DisplayName("should clear completedAt on resume")
        void shouldClearCompletedAt() {
            Task task = createCompletedTask();
            assertThat(task.getCompletedAt()).isNotNull();

            when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
            when(taskRepository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));
            when(taskEventRepository.save(any(TaskEvent.class))).thenAnswer(inv -> inv.getArgument(0));
            when(taskMapper.toResponse(any(Task.class))).thenReturn(TaskResponse.builder().build());
            when(taskMapper.toEventResponse(any(TaskEvent.class))).thenReturn(TaskEventResponse.builder().build());

            taskService.resumeTask(task.getId(), "Continue work");

            ArgumentCaptor<Task> captor = ArgumentCaptor.forClass(Task.class);
            verify(taskRepository).save(captor.capture());

            Task saved = captor.getValue();
            assertThat(saved.getCompletedAt()).isNull();
        }

        @Test
        @DisplayName("should resume a failed task")
        void shouldResumeFailedTask() {
            Task task = createFailedTask();
            when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
            when(taskRepository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));
            when(taskEventRepository.save(any(TaskEvent.class))).thenAnswer(inv -> inv.getArgument(0));
            when(taskMapper.toResponse(any(Task.class))).thenReturn(TaskResponse.builder().build());
            when(taskMapper.toEventResponse(any(TaskEvent.class))).thenReturn(TaskEventResponse.builder().build());

            taskService.resumeTask(task.getId(), "Fix the error and retry");

            ArgumentCaptor<Task> captor = ArgumentCaptor.forClass(Task.class);
            verify(taskRepository).save(captor.capture());

            Task saved = captor.getValue();
            assertThat(saved.getStatus()).isEqualTo(TaskStatus.PENDING);
            assertThat(saved.getResumePrompt()).isEqualTo("Fix the error and retry");
        }

        @Test
        @DisplayName("should broadcast task update via SSE")
        void shouldBroadcastSseUpdate() {
            Task task = createCompletedTask();
            TaskResponse response = TaskResponse.builder().build();

            when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
            when(taskRepository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));
            when(taskEventRepository.save(any(TaskEvent.class))).thenAnswer(inv -> inv.getArgument(0));
            when(taskMapper.toResponse(any(Task.class))).thenReturn(response);
            when(taskMapper.toEventResponse(any(TaskEvent.class))).thenReturn(TaskEventResponse.builder().build());

            taskService.resumeTask(task.getId(), "prompt");

            verify(sseService).broadcastTaskUpdate(response);
            verify(sseService).sendTaskEvent(eq(task.getId()), any(TaskEventResponse.class));
        }
    }

    @Nested
    @DisplayName("resumeTask - multiple resumes")
    class ResumeTaskMultiple {

        @Test
        @DisplayName("should properly increment resumeCount across multiple resumes")
        void shouldIncrementCountMultipleTimes() {
            Task task = createCompletedTask();
            task.setResumeCount(2); // Already resumed twice

            when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
            when(taskRepository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));
            when(taskEventRepository.save(any(TaskEvent.class))).thenAnswer(inv -> inv.getArgument(0));
            when(taskMapper.toResponse(any(Task.class))).thenReturn(TaskResponse.builder().build());
            when(taskMapper.toEventResponse(any(TaskEvent.class))).thenReturn(TaskEventResponse.builder().build());

            taskService.resumeTask(task.getId(), "Third resume");

            ArgumentCaptor<Task> captor = ArgumentCaptor.forClass(Task.class);
            verify(taskRepository).save(captor.capture());

            Task saved = captor.getValue();
            assertThat(saved.getResumeCount()).isEqualTo(3);
        }

        @Test
        @DisplayName("should include attempt number in event message")
        void shouldIncludeAttemptNumber() {
            Task task = createCompletedTask();
            task.setResumeCount(4);

            when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
            when(taskRepository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));
            when(taskEventRepository.save(any(TaskEvent.class))).thenAnswer(inv -> inv.getArgument(0));
            when(taskMapper.toResponse(any(Task.class))).thenReturn(TaskResponse.builder().build());
            when(taskMapper.toEventResponse(any(TaskEvent.class))).thenReturn(TaskEventResponse.builder().build());

            taskService.resumeTask(task.getId(), "Another resume");

            ArgumentCaptor<TaskEvent> eventCaptor = ArgumentCaptor.forClass(TaskEvent.class);
            verify(taskEventRepository).save(eventCaptor.capture());

            TaskEvent event = eventCaptor.getValue();
            assertThat(event.getMessage()).contains("#5");
        }
    }

    @Nested
    @DisplayName("resumeTask - failure scenarios")
    class ResumeTaskFailure {

        @Test
        @DisplayName("should throw when task is IN_PROGRESS")
        void shouldFailWhenInProgress() {
            Task task = createInProgressTask();
            when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));

            assertThatThrownBy(() -> taskService.resumeTask(task.getId(), "Resume prompt"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("Can only resume completed or failed tasks");
        }

        @Test
        @DisplayName("should throw when task is PENDING")
        void shouldFailWhenPending() {
            Task task = createCompletedTask();
            task.setStatus(TaskStatus.PENDING);
            when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));

            assertThatThrownBy(() -> taskService.resumeTask(task.getId(), "Resume prompt"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("Can only resume completed or failed tasks");
        }

        @Test
        @DisplayName("should throw when task is QUEUED")
        void shouldFailWhenQueued() {
            Task task = createCompletedTask();
            task.setStatus(TaskStatus.QUEUED);
            when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));

            assertThatThrownBy(() -> taskService.resumeTask(task.getId(), "Resume prompt"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("Can only resume completed or failed tasks");
        }

        @Test
        @DisplayName("should throw when task is CANCELLED")
        void shouldFailWhenCancelled() {
            Task task = createCompletedTask();
            task.setStatus(TaskStatus.CANCELLED);
            when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));

            assertThatThrownBy(() -> taskService.resumeTask(task.getId(), "Resume prompt"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("Can only resume completed or failed tasks");
        }

        @Test
        @DisplayName("should throw when task not found")
        void shouldFailWhenTaskNotFound() {
            UUID unknownId = UUID.randomUUID();
            when(taskRepository.findById(unknownId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> taskService.resumeTask(unknownId, "Resume prompt"))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Task not found");
        }

        @Test
        @DisplayName("should not save task when status is invalid")
        void shouldNotSaveWhenInvalidStatus() {
            Task task = createInProgressTask();
            when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));

            assertThatThrownBy(() -> taskService.resumeTask(task.getId(), "Resume prompt"))
                    .isInstanceOf(IllegalStateException.class);

            verify(taskRepository, never()).save(any(Task.class));
            verify(taskEventRepository, never()).save(any(TaskEvent.class));
        }
    }
}
