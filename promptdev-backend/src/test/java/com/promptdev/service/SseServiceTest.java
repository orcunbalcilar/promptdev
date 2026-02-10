package com.promptdev.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.promptdev.dto.TaskResponse;
import com.promptdev.entity.TaskStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.context.request.async.AsyncRequestNotUsableException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SseServiceTest {

    private SseService sseService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        sseService = new SseService(objectMapper);
    }

    @Nested
    @DisplayName("subscribeToAllTasks")
    class SubscribeToAllTasks {

        @Test
        @DisplayName("should return an SSE emitter")
        void shouldReturnEmitter() {
            SseEmitter emitter = sseService.subscribeToAllTasks();
            assertThat(emitter).isNotNull();
        }

        @Test
        @DisplayName("should increase subscriber count")
        void shouldIncreaseSubscriberCount() {
            int before = sseService.getActiveSubscriberCount();
            sseService.subscribeToAllTasks();
            assertThat(sseService.getActiveSubscriberCount()).isGreaterThan(before);
        }
    }

    @Nested
    @DisplayName("subscribeToTask")
    class SubscribeToTask {

        @Test
        @DisplayName("should return an SSE emitter for specific task")
        void shouldReturnEmitter() {
            UUID taskId = UUID.randomUUID();
            SseEmitter emitter = sseService.subscribeToTask(taskId);
            assertThat(emitter).isNotNull();
        }

        @Test
        @DisplayName("should increase subscriber count")
        void shouldIncreaseCount() {
            UUID taskId = UUID.randomUUID();
            int before = sseService.getActiveSubscriberCount();
            sseService.subscribeToTask(taskId);
            assertThat(sseService.getActiveSubscriberCount()).isGreaterThan(before);
        }
    }

    @Nested
    @DisplayName("sendHeartbeats")
    class SendHeartbeats {

        @Test
        @DisplayName("should not throw when no subscribers exist")
        void shouldNotThrowWhenEmpty() {
            assertThatCode(() -> sseService.sendHeartbeats())
                    .doesNotThrowAnyException();
        }

        @Test
        @DisplayName("should handle disconnected clients gracefully")
        void shouldHandleDisconnectedClients() {
            // Subscribe to add emitters
            sseService.subscribeToAllTasks();
            sseService.subscribeToAllTasks();

            // Heartbeats should not throw even if clients disconnect
            assertThatCode(() -> sseService.sendHeartbeats())
                    .doesNotThrowAnyException();
        }
    }

    @Nested
    @DisplayName("broadcastTaskUpdate")
    class BroadcastTaskUpdate {

        @Test
        @DisplayName("should not throw when no subscribers exist")
        void shouldNotThrowWhenEmpty() {
            TaskResponse task = TaskResponse.builder()
                    .id(UUID.randomUUID())
                    .title("Test")
                    .status(TaskStatus.PENDING)
                    .build();

            assertThatCode(() -> sseService.broadcastTaskUpdate(task))
                    .doesNotThrowAnyException();
        }
    }

    @Nested
    @DisplayName("sendTaskEvent")
    class SendTaskEvent {

        @Test
        @DisplayName("should not throw when no subscribers exist for task")
        void shouldNotThrowWhenEmpty() {
            UUID taskId = UUID.randomUUID();

            assertThatCode(() -> sseService.sendTaskEvent(taskId, null))
                    .doesNotThrowAnyException();
        }
    }

    @Nested
    @DisplayName("getActiveSubscriberCount")
    class GetActiveSubscriberCount {

        @Test
        @DisplayName("should return 0 initially")
        void shouldReturnZeroInitially() {
            assertThat(sseService.getActiveSubscriberCount()).isEqualTo(0);
        }

        @Test
        @DisplayName("should count both global and task subscribers")
        void shouldCountBothTypes() {
            sseService.subscribeToAllTasks();
            sseService.subscribeToTask(UUID.randomUUID());

            assertThat(sseService.getActiveSubscriberCount()).isEqualTo(2);
        }
    }
}
