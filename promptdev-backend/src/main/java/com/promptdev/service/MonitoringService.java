package com.promptdev.service;

import com.promptdev.dto.MonitoringDashboardResponse;
import com.promptdev.dto.RegisterSessionRequest;
import com.promptdev.dto.TrackOperationRequest;
import com.promptdev.entity.*;
import com.promptdev.repository.CopilotOperationRepository;
import com.promptdev.repository.CopilotSessionRepository;
import com.promptdev.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for monitoring all Copilot operations.
 * Provides full visibility into sessions, messages, tool executions, and errors.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MonitoringService {

    private final CopilotSessionRepository sessionRepository;
    private final CopilotOperationRepository operationRepository;
    private final TaskRepository taskRepository;

    /**
     * Register a new Copilot session for monitoring.
     */
    @Transactional
    public CopilotSession registerSession(RegisterSessionRequest request) {
        log.info("Registering session: sdkId={}, model={}", request.getSdkSessionId(), request.getModel());

        CopilotSession session = CopilotSession.builder()
                .sdkSessionId(request.getSdkSessionId())
                .model(request.getModel())
                .reasoningEffort(request.getReasoningEffort())
                .status(CopilotSessionStatus.ACTIVE)
                .source(request.getSource() != null ? request.getSource() : "web")
                .build();

        if (request.getTaskId() != null) {
            taskRepository.findById(UUID.fromString(request.getTaskId()))
                    .ifPresent(session::setTask);
        }

        session = sessionRepository.save(session);

        // Track the creation operation
        trackOperationInternal(session, null, OperationType.SESSION_CREATED,
                "Session created with model " + request.getModel(), null, request.getSource());

        return session;
    }

    /**
     * Track an operation within a session.
     */
    @Transactional
    public CopilotOperation trackOperation(TrackOperationRequest request) {
        CopilotSession session = null;
        Task task = null;

        if (request.getSessionId() != null) {
            session = sessionRepository.findBySdkSessionId(request.getSessionId()).orElse(null);
        }

        if (request.getTaskId() != null) {
            task = taskRepository.findById(UUID.fromString(request.getTaskId())).orElse(null);
        }

        CopilotOperation operation = CopilotOperation.builder()
                .session(session)
                .task(task)
                .operationType(request.getOperationType())
                .message(request.getMessage())
                .details(request.getDetails())
                .toolName(request.getToolName())
                .model(request.getModel())
                .inputTokens(request.getInputTokens())
                .outputTokens(request.getOutputTokens())
                .durationMs(request.getDurationMs())
                .success(request.getSuccess() != null ? request.getSuccess() : true)
                .errorMessage(request.getErrorMessage())
                .source(request.getSource() != null ? request.getSource() : "web")
                .clientInfo(request.getClientInfo())
                .build();

        operation = operationRepository.save(operation);

        // Update session counters
        if (session != null) {
            updateSessionCounters(session, request);
        }

        return operation;
    }

    /**
     * Bulk track operations (for batched events).
     */
    @Transactional
    public List<CopilotOperation> trackOperations(List<TrackOperationRequest> requests) {
        return requests.stream()
                .map(this::trackOperation)
                .toList();
    }

    /**
     * Mark a session as ended.
     */
    @Transactional
    public void endSession(String sdkSessionId) {
        sessionRepository.findBySdkSessionId(sdkSessionId).ifPresent(session -> {
            session.setStatus(CopilotSessionStatus.DESTROYED);
            session.setEndedAt(LocalDateTime.now());
            sessionRepository.save(session);

            trackOperationInternal(session, null, OperationType.SESSION_DESTROYED,
                    "Session ended", null, session.getSource());

            log.info("Session ended: {}", sdkSessionId);
        });
    }

    /**
     * Get monitoring dashboard metrics.
     */
    @Transactional(readOnly = true)
    public MonitoringDashboardResponse getDashboard(int days) {
        LocalDateTime since = LocalDateTime.now().minusDays(days);

        long totalSessions = sessionRepository.count();
        long activeSessions = sessionRepository.countByStatus(CopilotSessionStatus.ACTIVE);
        long totalOperations = operationRepository.count();

        // Token usage
        Long inputTokens = sessionRepository.totalInputTokensSince(since);
        Long outputTokens = sessionRepository.totalOutputTokensSince(since);

        // Operations by type
        Map<String, Long> operationsByType = operationRepository.countByTypeSince(since).stream()
                .collect(Collectors.toMap(
                        row -> ((OperationType) row[0]).name(),
                        row -> (Long) row[1],
                        (a, b) -> a,
                        LinkedHashMap::new
                ));

        // Sessions by model
        Map<String, Long> sessionsByModel = sessionRepository.countByModelSince(since).stream()
                .collect(Collectors.toMap(
                        row -> (String) row[0],
                        row -> (Long) row[1],
                        (a, b) -> a,
                        LinkedHashMap::new
                ));

        // Sessions by source
        Map<String, Long> sessionsBySource = sessionRepository.countBySourceSince(since).stream()
                .collect(Collectors.toMap(
                        row -> (String) row[0],
                        row -> (Long) row[1],
                        (a, b) -> a,
                        LinkedHashMap::new
                ));

        // Tool usage stats
        List<MonitoringDashboardResponse.ToolUsageStat> topTools =
                operationRepository.toolUsageStatsSince(since).stream()
                        .map(row -> MonitoringDashboardResponse.ToolUsageStat.builder()
                                .toolName((String) row[0])
                                .executionCount((Long) row[1])
                                .avgDurationMs(row[2] != null ? ((Number) row[2]).doubleValue() : 0.0)
                                .build())
                        .toList();

        // Daily operation counts
        List<MonitoringDashboardResponse.DailyCount> dailyOperations =
                operationRepository.dailyOperationCounts(since).stream()
                        .map(row -> MonitoringDashboardResponse.DailyCount.builder()
                                .date(row[0].toString())
                                .count((Long) row[1])
                                .build())
                        .toList();

        // Recent errors
        Page<CopilotOperation> errors = operationRepository.findErrors(PageRequest.of(0, 10));
        List<MonitoringDashboardResponse.OperationSummary> recentErrors = errors.getContent().stream()
                .map(op -> MonitoringDashboardResponse.OperationSummary.builder()
                        .id(op.getId().toString())
                        .operationType(op.getOperationType().name())
                        .message(op.getMessage())
                        .errorMessage(op.getErrorMessage())
                        .timestamp(op.getTimestamp().toString())
                        .sessionId(op.getSession() != null ? op.getSession().getSdkSessionId() : null)
                        .build())
                .toList();

        return MonitoringDashboardResponse.builder()
                .totalSessions(totalSessions)
                .activeSessions(activeSessions)
                .totalOperations(totalOperations)
                .totalErrors(errors.getTotalElements())
                .totalInputTokens(inputTokens != null ? inputTokens : 0L)
                .totalOutputTokens(outputTokens != null ? outputTokens : 0L)
                .operationsByType(operationsByType)
                .sessionsByModel(sessionsByModel)
                .sessionsBySource(sessionsBySource)
                .topTools(topTools)
                .dailyOperations(dailyOperations)
                .recentErrors(recentErrors)
                .build();
    }

    /**
     * Get all sessions (paginated).
     */
    @Transactional(readOnly = true)
    public Page<CopilotSession> getSessions(Pageable pageable) {
        return sessionRepository.findAllByOrderByCreatedAtDesc(pageable);
    }

    /**
     * Find a single session by its SDK-assigned session ID.
     */
    @Transactional(readOnly = true)
    public java.util.Optional<CopilotSession> getSessionBySDKId(String sdkSessionId) {
        return sessionRepository.findBySdkSessionId(sdkSessionId);
    }

    /**
     * Get operations for a specific session.
     */
    @Transactional(readOnly = true)
    public List<CopilotOperation> getSessionOperations(String sdkSessionId) {
        CopilotSession session = sessionRepository.findBySdkSessionId(sdkSessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found: " + sdkSessionId));
        return operationRepository.findBySessionIdOrderByTimestampAsc(session.getId());
    }

    /**
     * Get all operations (paginated).
     */
    @Transactional(readOnly = true)
    public Page<CopilotOperation> getOperations(Pageable pageable) {
        return operationRepository.findAllByOrderByTimestampDesc(pageable);
    }

    // --- Internal helpers ---

    private void updateSessionCounters(CopilotSession session, TrackOperationRequest request) {
        switch (request.getOperationType()) {
            case MESSAGE_SENT, MESSAGE_RECEIVED ->
                    session.setMessageCount(session.getMessageCount() + 1);
            case TOOL_EXECUTION_START ->
                    session.setToolExecutionCount(session.getToolExecutionCount() + 1);
            case ERROR, SESSION_ERROR, TOOL_EXECUTION_ERROR ->
                    session.setErrorCount(session.getErrorCount() + 1);
            default -> { /* no counter update needed */ }
        }

        if (request.getInputTokens() != null) {
            session.setTotalInputTokens(session.getTotalInputTokens() + request.getInputTokens());
        }
        if (request.getOutputTokens() != null) {
            session.setTotalOutputTokens(session.getTotalOutputTokens() + request.getOutputTokens());
        }

        sessionRepository.save(session);
    }

    private void trackOperationInternal(CopilotSession session, Task task,
                                         OperationType type, String message,
                                         String details, String source) {
        CopilotOperation operation = CopilotOperation.builder()
                .session(session)
                .task(task)
                .operationType(type)
                .message(message)
                .details(details)
                .source(source != null ? source : "system")
                .build();
        operationRepository.save(operation);
    }
}
