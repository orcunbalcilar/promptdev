package com.promptdev.service;

import com.promptdev.config.BitbucketConfig;
import com.promptdev.dto.AgentCallbackRequest;
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

import java.util.ArrayList;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Tests for the Ralph Wiggum loop guard — ensures tasks cannot
 * exceed maxAttempts via retry or AGENT_STARTED callbacks.
 */
@ExtendWith(MockitoExtension.class)
class TaskServiceLoopGuardTest {

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

    private UUID taskId;
    private Task task;

    @BeforeEach
    void setUp() {
        taskId = UUID.randomUUID();
        task = Task.builder()
                .id(taskId)
                .title("Loop guard test")
                .prompt("Test prompt")
                .repositorySlug("repo")
                .status(TaskStatus.FAILED)
                .currentAttempt(0)
                .maxAttempts(3)
                .events(new ArrayList<>())
                .build();
    }

    @Nested
    @DisplayName("retryTask loop guard")
    class RetryTaskLoopGuard {

        @Test
        @DisplayName("should allow retry when currentAttempt < maxAttempts")
        void shouldAllowRetryUnderLimit() {
            task.setCurrentAttempt(1);
            task.setMaxAttempts(3);
            task.setStatus(TaskStatus.FAILED);
            when(taskRepository.findById(taskId)).thenReturn(Optional.of(task));
            when(taskRepository.save(any(Task.class))).thenReturn(task);
            when(taskMapper.toResponse(any(Task.class))).thenReturn(TaskResponse.builder().id(taskId).build());

            assertThatCode(() -> taskService.retryTask(taskId)).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("should reject retry when currentAttempt == maxAttempts")
        void shouldRejectRetryAtLimit() {
            task.setCurrentAttempt(3);
            task.setMaxAttempts(3);
            task.setStatus(TaskStatus.FAILED);
            when(taskRepository.findById(taskId)).thenReturn(Optional.of(task));

            assertThatThrownBy(() -> taskService.retryTask(taskId))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("Maximum retry attempts reached")
                    .hasMessageContaining("3/3");
        }

        @Test
        @DisplayName("should reject retry when currentAttempt > maxAttempts")
        void shouldRejectRetryBeyondLimit() {
            task.setCurrentAttempt(5);
            task.setMaxAttempts(3);
            task.setStatus(TaskStatus.FAILED);
            when(taskRepository.findById(taskId)).thenReturn(Optional.of(task));

            assertThatThrownBy(() -> taskService.retryTask(taskId))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("Maximum retry attempts reached");
        }

        @Test
        @DisplayName("should still reject non-failed tasks before checking attempts")
        void shouldRejectNonFailedFirst() {
            task.setStatus(TaskStatus.IN_PROGRESS);
            task.setCurrentAttempt(0);
            when(taskRepository.findById(taskId)).thenReturn(Optional.of(task));

            assertThatThrownBy(() -> taskService.retryTask(taskId))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("Can only retry failed tasks");
        }
    }

    @Nested
    @DisplayName("AGENT_STARTED callback loop guard")
    class AgentStartedLoopGuard {

        @Test
        @DisplayName("should allow AGENT_STARTED when under limit")
        void shouldAllowAgentStartedUnderLimit() {
            task.setCurrentAttempt(1);
            task.setMaxAttempts(3);
            task.setStatus(TaskStatus.QUEUED);
            when(taskRepository.findById(taskId)).thenReturn(Optional.of(task));
            when(taskRepository.save(any(Task.class))).thenReturn(task);
            when(taskMapper.toResponse(any(Task.class))).thenReturn(TaskResponse.builder().id(taskId).build());
            when(taskMapper.toEventResponse(any(TaskEvent.class))).thenReturn(null);

            AgentCallbackRequest callback = AgentCallbackRequest.builder()
                    .taskId(taskId)
                    .eventType(EventType.AGENT_STARTED)
                    .message("Agent started")
                    .build();

            taskService.processAgentCallback(callback);

            ArgumentCaptor<Task> captor = ArgumentCaptor.forClass(Task.class);
            verify(taskRepository).save(captor.capture());
            Task saved = captor.getValue();

            assertThat(saved.getStatus()).isEqualTo(TaskStatus.IN_PROGRESS);
            assertThat(saved.getCurrentAttempt()).isEqualTo(2);
        }

        @Test
        @DisplayName("should mark FAILED when AGENT_STARTED exceeds maxAttempts")
        void shouldMarkFailedWhenExceedingMaxAttempts() {
            task.setCurrentAttempt(3);
            task.setMaxAttempts(3);
            task.setStatus(TaskStatus.QUEUED);
            when(taskRepository.findById(taskId)).thenReturn(Optional.of(task));
            when(taskRepository.save(any(Task.class))).thenReturn(task);
            when(taskMapper.toResponse(any(Task.class))).thenReturn(TaskResponse.builder().id(taskId).build());
            when(taskMapper.toEventResponse(any(TaskEvent.class))).thenReturn(null);

            AgentCallbackRequest callback = AgentCallbackRequest.builder()
                    .taskId(taskId)
                    .eventType(EventType.AGENT_STARTED)
                    .message("Agent started")
                    .build();

            taskService.processAgentCallback(callback);

            ArgumentCaptor<Task> captor = ArgumentCaptor.forClass(Task.class);
            verify(taskRepository).save(captor.capture());
            Task saved = captor.getValue();

            assertThat(saved.getStatus()).isEqualTo(TaskStatus.FAILED);
            assertThat(saved.getErrorMessage()).contains("Maximum attempts exceeded");
            // currentAttempt should NOT be incremented since we hit the guard
            assertThat(saved.getCurrentAttempt()).isEqualTo(3);
        }

        @Test
        @DisplayName("should allow first attempt on fresh task")
        void shouldAllowFirstAttempt() {
            task.setCurrentAttempt(0);
            task.setMaxAttempts(3);
            task.setStatus(TaskStatus.QUEUED);
            when(taskRepository.findById(taskId)).thenReturn(Optional.of(task));
            when(taskRepository.save(any(Task.class))).thenReturn(task);
            when(taskMapper.toResponse(any(Task.class))).thenReturn(TaskResponse.builder().id(taskId).build());
            when(taskMapper.toEventResponse(any(TaskEvent.class))).thenReturn(null);

            AgentCallbackRequest callback = AgentCallbackRequest.builder()
                    .taskId(taskId)
                    .eventType(EventType.AGENT_STARTED)
                    .message("First start")
                    .build();

            taskService.processAgentCallback(callback);

            ArgumentCaptor<Task> captor = ArgumentCaptor.forClass(Task.class);
            verify(taskRepository).save(captor.capture());
            Task saved = captor.getValue();

            assertThat(saved.getStatus()).isEqualTo(TaskStatus.IN_PROGRESS);
            assertThat(saved.getCurrentAttempt()).isEqualTo(1);
        }

        @Test
        @DisplayName("should guard at exact boundary (maxAttempts=1, currentAttempt=1)")
        void shouldGuardAtBoundary() {
            task.setCurrentAttempt(1);
            task.setMaxAttempts(1);
            task.setStatus(TaskStatus.QUEUED);
            when(taskRepository.findById(taskId)).thenReturn(Optional.of(task));
            when(taskRepository.save(any(Task.class))).thenReturn(task);
            when(taskMapper.toResponse(any(Task.class))).thenReturn(TaskResponse.builder().id(taskId).build());
            when(taskMapper.toEventResponse(any(TaskEvent.class))).thenReturn(null);

            AgentCallbackRequest callback = AgentCallbackRequest.builder()
                    .taskId(taskId)
                    .eventType(EventType.AGENT_STARTED)
                    .message("Second start attempt")
                    .build();

            taskService.processAgentCallback(callback);

            ArgumentCaptor<Task> captor = ArgumentCaptor.forClass(Task.class);
            verify(taskRepository).save(captor.capture());
            Task saved = captor.getValue();

            assertThat(saved.getStatus()).isEqualTo(TaskStatus.FAILED);
            assertThat(saved.getErrorMessage()).contains("Maximum attempts exceeded");
        }
    }
}
