package com.promptdev.service;

import com.promptdev.dto.MonitoringDashboardResponse;
import com.promptdev.dto.RegisterSessionRequest;
import com.promptdev.dto.TrackOperationRequest;
import com.promptdev.entity.*;
import com.promptdev.repository.CopilotOperationRepository;
import com.promptdev.repository.CopilotSessionRepository;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MonitoringServiceTest {

    @Mock
    private CopilotSessionRepository sessionRepository;

    @Mock
    private CopilotOperationRepository operationRepository;

    @Mock
    private TaskRepository taskRepository;

    @InjectMocks
    private MonitoringService monitoringService;

    private RegisterSessionRequest sampleRegisterRequest;
    private CopilotSession sampleSession;
    private Task sampleTask;

    @BeforeEach
    void setUp() {
        sampleRegisterRequest = RegisterSessionRequest.builder()
                .sdkSessionId("sdk-123-abc")
                .model("gpt-5.2")
                .reasoningEffort("medium")
                .source("web")
                .build();

        sampleSession = CopilotSession.builder()
                .id(UUID.randomUUID())
                .sdkSessionId("sdk-123-abc")
                .model("gpt-5.2")
                .reasoningEffort("medium")
                .status(CopilotSessionStatus.ACTIVE)
                .source("web")
                .totalInputTokens(0L)
                .totalOutputTokens(0L)
                .messageCount(0)
                .toolExecutionCount(0)
                .errorCount(0)
                .operations(new ArrayList<>())
                .createdAt(LocalDateTime.now())
                .build();

        sampleTask = Task.builder()
                .id(UUID.randomUUID())
                .title("Test task")
                .prompt("Test prompt")
                .repositorySlug("test-repo")
                .status(TaskStatus.PENDING)
                .build();
    }

    @Nested
    @DisplayName("registerSession")
    class RegisterSession {

        @Test
        @DisplayName("should register a new session with correct fields")
        void shouldCreateSessionWithCorrectFields() {
            when(sessionRepository.save(any(CopilotSession.class)))
                    .thenAnswer(inv -> {
                        CopilotSession s = inv.getArgument(0);
                        s.setId(UUID.randomUUID());
                        return s;
                    });
            when(operationRepository.save(any(CopilotOperation.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            CopilotSession result = monitoringService.registerSession(sampleRegisterRequest);

            assertThat(result.getSdkSessionId()).isEqualTo("sdk-123-abc");
            assertThat(result.getModel()).isEqualTo("gpt-5.2");
            assertThat(result.getReasoningEffort()).isEqualTo("medium");
            assertThat(result.getStatus()).isEqualTo(CopilotSessionStatus.ACTIVE);
            assertThat(result.getSource()).isEqualTo("web");
        }

        @Test
        @DisplayName("should default source to 'web' when not provided")
        void shouldDefaultSourceToWeb() {
            RegisterSessionRequest requestNoSource = RegisterSessionRequest.builder()
                    .sdkSessionId("sdk-456")
                    .model("claude-sonnet-4.5")
                    .build();

            when(sessionRepository.save(any(CopilotSession.class)))
                    .thenAnswer(inv -> {
                        CopilotSession s = inv.getArgument(0);
                        s.setId(UUID.randomUUID());
                        return s;
                    });
            when(operationRepository.save(any(CopilotOperation.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            CopilotSession result = monitoringService.registerSession(requestNoSource);

            assertThat(result.getSource()).isEqualTo("web");
        }

        @Test
        @DisplayName("should associate task when taskId is provided")
        void shouldAssociateTaskWhenProvided() {
            sampleRegisterRequest.setTaskId(sampleTask.getId().toString());

            when(taskRepository.findById(sampleTask.getId()))
                    .thenReturn(Optional.of(sampleTask));
            when(sessionRepository.save(any(CopilotSession.class)))
                    .thenAnswer(inv -> {
                        CopilotSession s = inv.getArgument(0);
                        s.setId(UUID.randomUUID());
                        return s;
                    });
            when(operationRepository.save(any(CopilotOperation.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            CopilotSession result = monitoringService.registerSession(sampleRegisterRequest);

            assertThat(result.getTask()).isEqualTo(sampleTask);
        }

        @Test
        @DisplayName("should track SESSION_CREATED operation")
        void shouldTrackCreationOperation() {
            when(sessionRepository.save(any(CopilotSession.class)))
                    .thenAnswer(inv -> {
                        CopilotSession s = inv.getArgument(0);
                        s.setId(UUID.randomUUID());
                        return s;
                    });
            when(operationRepository.save(any(CopilotOperation.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            monitoringService.registerSession(sampleRegisterRequest);

            ArgumentCaptor<CopilotOperation> captor = ArgumentCaptor.forClass(CopilotOperation.class);
            verify(operationRepository).save(captor.capture());

            CopilotOperation tracked = captor.getValue();
            assertThat(tracked.getOperationType()).isEqualTo(OperationType.SESSION_CREATED);
            assertThat(tracked.getMessage()).contains("gpt-5.2");
        }
    }

    @Nested
    @DisplayName("trackOperation")
    class TrackOperation {

        @Test
        @DisplayName("should track operation with all fields")
        void shouldSaveWithAllFields() {
            TrackOperationRequest request = TrackOperationRequest.builder()
                    .sessionId("sdk-123-abc")
                    .operationType(OperationType.MESSAGE_SENT)
                    .message("Hello, agent")
                    .details("{\"content\":\"Hello\"}")
                    .model("gpt-5.2")
                    .inputTokens(150L)
                    .outputTokens(0L)
                    .source("web")
                    .build();

            when(sessionRepository.findBySdkSessionId("sdk-123-abc"))
                    .thenReturn(Optional.of(sampleSession));
            when(operationRepository.save(any(CopilotOperation.class)))
                    .thenAnswer(inv -> {
                        CopilotOperation op = inv.getArgument(0);
                        op.setId(UUID.randomUUID());
                        return op;
                    });
            when(sessionRepository.save(any(CopilotSession.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            CopilotOperation result = monitoringService.trackOperation(request);

            assertThat(result.getOperationType()).isEqualTo(OperationType.MESSAGE_SENT);
            assertThat(result.getMessage()).isEqualTo("Hello, agent");
            assertThat(result.getModel()).isEqualTo("gpt-5.2");
            assertThat(result.getInputTokens()).isEqualTo(150L);
        }

        @Test
        @DisplayName("should update session message count on MESSAGE_SENT")
        void shouldUpdateMessageCount() {
            TrackOperationRequest request = TrackOperationRequest.builder()
                    .sessionId("sdk-123-abc")
                    .operationType(OperationType.MESSAGE_SENT)
                    .message("Test message")
                    .build();

            when(sessionRepository.findBySdkSessionId("sdk-123-abc"))
                    .thenReturn(Optional.of(sampleSession));
            when(operationRepository.save(any(CopilotOperation.class)))
                    .thenAnswer(inv -> {
                        CopilotOperation op = inv.getArgument(0);
                        op.setId(UUID.randomUUID());
                        return op;
                    });
            when(sessionRepository.save(any(CopilotSession.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            monitoringService.trackOperation(request);

            assertThat(sampleSession.getMessageCount()).isEqualTo(1);
        }

        @Test
        @DisplayName("should update session tool count on TOOL_EXECUTION_START")
        void shouldUpdateToolCount() {
            TrackOperationRequest request = TrackOperationRequest.builder()
                    .sessionId("sdk-123-abc")
                    .operationType(OperationType.TOOL_EXECUTION_START)
                    .toolName("createFile")
                    .build();

            when(sessionRepository.findBySdkSessionId("sdk-123-abc"))
                    .thenReturn(Optional.of(sampleSession));
            when(operationRepository.save(any(CopilotOperation.class)))
                    .thenAnswer(inv -> {
                        CopilotOperation op = inv.getArgument(0);
                        op.setId(UUID.randomUUID());
                        return op;
                    });
            when(sessionRepository.save(any(CopilotSession.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            monitoringService.trackOperation(request);

            assertThat(sampleSession.getToolExecutionCount()).isEqualTo(1);
        }

        @Test
        @DisplayName("should update session error count on ERROR")
        void shouldUpdateErrorCount() {
            TrackOperationRequest request = TrackOperationRequest.builder()
                    .sessionId("sdk-123-abc")
                    .operationType(OperationType.ERROR)
                    .errorMessage("Something went wrong")
                    .success(false)
                    .build();

            when(sessionRepository.findBySdkSessionId("sdk-123-abc"))
                    .thenReturn(Optional.of(sampleSession));
            when(operationRepository.save(any(CopilotOperation.class)))
                    .thenAnswer(inv -> {
                        CopilotOperation op = inv.getArgument(0);
                        op.setId(UUID.randomUUID());
                        return op;
                    });
            when(sessionRepository.save(any(CopilotSession.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            monitoringService.trackOperation(request);

            assertThat(sampleSession.getErrorCount()).isEqualTo(1);
        }

        @Test
        @DisplayName("should accumulate token counts in session")
        void shouldAccumulateTokenCounts() {
            TrackOperationRequest request = TrackOperationRequest.builder()
                    .sessionId("sdk-123-abc")
                    .operationType(OperationType.MESSAGE_RECEIVED)
                    .inputTokens(100L)
                    .outputTokens(500L)
                    .build();

            when(sessionRepository.findBySdkSessionId("sdk-123-abc"))
                    .thenReturn(Optional.of(sampleSession));
            when(operationRepository.save(any(CopilotOperation.class)))
                    .thenAnswer(inv -> {
                        CopilotOperation op = inv.getArgument(0);
                        op.setId(UUID.randomUUID());
                        return op;
                    });
            when(sessionRepository.save(any(CopilotSession.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            monitoringService.trackOperation(request);

            assertThat(sampleSession.getTotalInputTokens()).isEqualTo(100L);
            assertThat(sampleSession.getTotalOutputTokens()).isEqualTo(500L);
        }

        @Test
        @DisplayName("should default success to true when not provided")
        void shouldDefaultSuccessToTrue() {
            TrackOperationRequest request = TrackOperationRequest.builder()
                    .operationType(OperationType.MESSAGE_SENT)
                    .message("Test")
                    .build();

            when(operationRepository.save(any(CopilotOperation.class)))
                    .thenAnswer(inv -> {
                        CopilotOperation op = inv.getArgument(0);
                        op.setId(UUID.randomUUID());
                        return op;
                    });

            CopilotOperation result = monitoringService.trackOperation(request);

            assertThat(result.getSuccess()).isTrue();
        }
    }

    @Nested
    @DisplayName("trackOperations (batch)")
    class TrackOperationsBatch {

        @Test
        @DisplayName("should process all operations in batch")
        void shouldProcessAll() {
            List<TrackOperationRequest> requests = List.of(
                    TrackOperationRequest.builder().operationType(OperationType.MESSAGE_SENT).build(),
                    TrackOperationRequest.builder().operationType(OperationType.MESSAGE_RECEIVED).build(),
                    TrackOperationRequest.builder().operationType(OperationType.TOOL_EXECUTION_START).build()
            );

            when(operationRepository.save(any(CopilotOperation.class)))
                    .thenAnswer(inv -> {
                        CopilotOperation op = inv.getArgument(0);
                        op.setId(UUID.randomUUID());
                        return op;
                    });

            List<CopilotOperation> results = monitoringService.trackOperations(requests);

            assertThat(results).hasSize(3);
            verify(operationRepository, times(3)).save(any(CopilotOperation.class));
        }
    }

    @Nested
    @DisplayName("endSession")
    class EndSession {

        @Test
        @DisplayName("should set status to DESTROYED and set endedAt")
        void shouldSetDestroyedStatus() {
            when(sessionRepository.findBySdkSessionId("sdk-123-abc"))
                    .thenReturn(Optional.of(sampleSession));
            when(sessionRepository.save(any(CopilotSession.class)))
                    .thenAnswer(inv -> inv.getArgument(0));
            when(operationRepository.save(any(CopilotOperation.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            monitoringService.endSession("sdk-123-abc");

            assertThat(sampleSession.getStatus()).isEqualTo(CopilotSessionStatus.DESTROYED);
            assertThat(sampleSession.getEndedAt()).isNotNull();
        }

        @Test
        @DisplayName("should track SESSION_DESTROYED operation")
        void shouldTrackDestroyedOperation() {
            when(sessionRepository.findBySdkSessionId("sdk-123-abc"))
                    .thenReturn(Optional.of(sampleSession));
            when(sessionRepository.save(any(CopilotSession.class)))
                    .thenAnswer(inv -> inv.getArgument(0));
            when(operationRepository.save(any(CopilotOperation.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            monitoringService.endSession("sdk-123-abc");

            ArgumentCaptor<CopilotOperation> captor = ArgumentCaptor.forClass(CopilotOperation.class);
            verify(operationRepository).save(captor.capture());
            assertThat(captor.getValue().getOperationType()).isEqualTo(OperationType.SESSION_DESTROYED);
        }

        @Test
        @DisplayName("should do nothing for unknown session")
        void shouldDoNothingForUnknownSession() {
            when(sessionRepository.findBySdkSessionId("unknown"))
                    .thenReturn(Optional.empty());

            monitoringService.endSession("unknown");

            verify(sessionRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("getDashboard")
    class GetDashboard {

        @Test
        @DisplayName("should return complete dashboard metrics")
        void shouldReturnMetrics() {
            when(sessionRepository.count()).thenReturn(10L);
            when(sessionRepository.countByStatus(CopilotSessionStatus.ACTIVE)).thenReturn(2L);
            when(operationRepository.count()).thenReturn(150L);
            when(sessionRepository.totalInputTokensSince(any())).thenReturn(5000L);
            when(sessionRepository.totalOutputTokensSince(any())).thenReturn(10000L);
            when(operationRepository.countByTypeSince(any())).thenReturn(
                    List.<Object[]>of(new Object[]{OperationType.MESSAGE_SENT, 50L})
            );
            when(sessionRepository.countByModelSince(any())).thenReturn(
                    List.<Object[]>of(new Object[]{"gpt-5.2", 8L})
            );
            when(sessionRepository.countBySourceSince(any())).thenReturn(
                    List.<Object[]>of(new Object[]{"web", 9L})
            );
            when(operationRepository.toolUsageStatsSince(any())).thenReturn(
                    List.<Object[]>of(new Object[]{"createFile", 20L, 150.5})
            );
            when(operationRepository.dailyOperationCounts(any())).thenReturn(
                    List.<Object[]>of(new Object[]{"2025-01-15", 30L})
            );
            when(operationRepository.findErrors(any())).thenReturn(
                    new PageImpl<>(List.of())
            );

            MonitoringDashboardResponse dashboard = monitoringService.getDashboard(7);

            assertThat(dashboard.getTotalSessions()).isEqualTo(10L);
            assertThat(dashboard.getActiveSessions()).isEqualTo(2L);
            assertThat(dashboard.getTotalOperations()).isEqualTo(150L);
            assertThat(dashboard.getTotalInputTokens()).isEqualTo(5000L);
            assertThat(dashboard.getTotalOutputTokens()).isEqualTo(10000L);
            assertThat(dashboard.getOperationsByType()).containsEntry("MESSAGE_SENT", 50L);
            assertThat(dashboard.getSessionsByModel()).containsEntry("gpt-5.2", 8L);
            assertThat(dashboard.getSessionsBySource()).containsEntry("web", 9L);
            assertThat(dashboard.getTopTools()).hasSize(1);
            assertThat(dashboard.getTopTools().getFirst().getToolName()).isEqualTo("createFile");
        }

        @Test
        @DisplayName("should handle null token totals gracefully")
        void shouldHandleNullTokens() {
            when(sessionRepository.count()).thenReturn(0L);
            when(sessionRepository.countByStatus(any())).thenReturn(0L);
            when(operationRepository.count()).thenReturn(0L);
            when(sessionRepository.totalInputTokensSince(any())).thenReturn(null);
            when(sessionRepository.totalOutputTokensSince(any())).thenReturn(null);
            when(operationRepository.countByTypeSince(any())).thenReturn(List.of());
            when(sessionRepository.countByModelSince(any())).thenReturn(List.of());
            when(sessionRepository.countBySourceSince(any())).thenReturn(List.of());
            when(operationRepository.toolUsageStatsSince(any())).thenReturn(List.of());
            when(operationRepository.dailyOperationCounts(any())).thenReturn(List.of());
            when(operationRepository.findErrors(any())).thenReturn(new PageImpl<>(List.of()));

            MonitoringDashboardResponse dashboard = monitoringService.getDashboard(30);

            assertThat(dashboard.getTotalInputTokens()).isZero();
            assertThat(dashboard.getTotalOutputTokens()).isZero();
        }
    }

    @Nested
    @DisplayName("getSessionOperations")
    class GetSessionOperations {

        @Test
        @DisplayName("should return operations for valid session")
        void shouldReturnOperations() {
            when(sessionRepository.findBySdkSessionId("sdk-123-abc"))
                    .thenReturn(Optional.of(sampleSession));

            CopilotOperation op = CopilotOperation.builder()
                    .id(UUID.randomUUID())
                    .session(sampleSession)
                    .operationType(OperationType.MESSAGE_SENT)
                    .build();

            when(operationRepository.findBySessionIdOrderByTimestampAsc(sampleSession.getId()))
                    .thenReturn(List.of(op));

            List<CopilotOperation> result = monitoringService.getSessionOperations("sdk-123-abc");

            assertThat(result).hasSize(1);
            assertThat(result.getFirst().getOperationType()).isEqualTo(OperationType.MESSAGE_SENT);
        }

        @Test
        @DisplayName("should throw exception for unknown session")
        void shouldThrowForUnknownSession() {
            when(sessionRepository.findBySdkSessionId("unknown"))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> monitoringService.getSessionOperations("unknown"))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Session not found");
        }
    }

    @Nested
    @DisplayName("getSessions")
    class GetSessions {

        @Test
        @DisplayName("should return paginated sessions")
        void shouldReturnPaginated() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<CopilotSession> page = new PageImpl<>(List.of(sampleSession));
            when(sessionRepository.findAllByOrderByCreatedAtDesc(pageable)).thenReturn(page);

            Page<CopilotSession> result = monitoringService.getSessions(pageable);

            assertThat(result.getTotalElements()).isEqualTo(1);
            assertThat(result.getContent().getFirst().getSdkSessionId()).isEqualTo("sdk-123-abc");
        }
    }
}
