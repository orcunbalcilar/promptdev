package com.promptdev.controller;

import com.promptdev.dto.MonitoringDashboardResponse;
import com.promptdev.dto.RegisterSessionRequest;
import com.promptdev.dto.TrackOperationRequest;
import com.promptdev.entity.CopilotOperation;
import com.promptdev.entity.CopilotSession;
import com.promptdev.service.MonitoringService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST controller for monitoring Copilot sessions and operations.
 * Provides full observability into all AI agent activities.
 */
@RestController
@RequestMapping("/monitoring")
@RequiredArgsConstructor
@Slf4j
public class MonitoringController {

    private final MonitoringService monitoringService;

    /**
     * Get monitoring dashboard metrics.
     */
    @GetMapping("/dashboard")
    public ResponseEntity<MonitoringDashboardResponse> getDashboard(
            @RequestParam(defaultValue = "7") int days) {
        MonitoringDashboardResponse dashboard = monitoringService.getDashboard(days);
        return ResponseEntity.ok(dashboard);
    }

    /**
     * Register a new Copilot session.
     */
    @PostMapping("/sessions")
    public ResponseEntity<Map<String, Object>> registerSession(
            @Valid @RequestBody RegisterSessionRequest request) {
        log.info("Registering session: {}", request.getSdkSessionId());
        CopilotSession session = monitoringService.registerSession(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "id", session.getId().toString(),
                "sdkSessionId", session.getSdkSessionId(),
                "status", session.getStatus().name()
        ));
    }

    /**
     * End a Copilot session.
     */
    @DeleteMapping("/sessions/{sdkSessionId}")
    public ResponseEntity<Void> endSession(@PathVariable String sdkSessionId) {
        log.info("Ending session: {}", sdkSessionId);
        monitoringService.endSession(sdkSessionId);
        return ResponseEntity.noContent().build();
    }

    /**
     * List all sessions (paginated).
     */
    @GetMapping("/sessions")
    public ResponseEntity<Page<CopilotSession>> getSessions(
            @PageableDefault(size = 20) Pageable pageable) {
        Page<CopilotSession> sessions = monitoringService.getSessions(pageable);
        return ResponseEntity.ok(sessions);
    }

    /**
     * Get operations for a specific session.
     */
    @GetMapping("/sessions/{sdkSessionId}/operations")
    public ResponseEntity<List<CopilotOperation>> getSessionOperations(
            @PathVariable String sdkSessionId) {
        List<CopilotOperation> operations = monitoringService.getSessionOperations(sdkSessionId);
        return ResponseEntity.ok(operations);
    }

    /**
     * Track a single operation.
     */
    @PostMapping("/operations")
    public ResponseEntity<Map<String, String>> trackOperation(
            @Valid @RequestBody TrackOperationRequest request) {
        CopilotOperation operation = monitoringService.trackOperation(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "id", operation.getId().toString()
        ));
    }

    /**
     * Track multiple operations in batch.
     */
    @PostMapping("/operations/batch")
    public ResponseEntity<Map<String, Object>> trackOperationsBatch(
            @Valid @RequestBody List<TrackOperationRequest> requests) {
        log.info("Batch tracking {} operations", requests.size());
        List<CopilotOperation> operations = monitoringService.trackOperations(requests);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "count", operations.size()
        ));
    }

    /**
     * List all operations (paginated).
     */
    @GetMapping("/operations")
    public ResponseEntity<Page<CopilotOperation>> getOperations(
            @PageableDefault(size = 50) Pageable pageable) {
        Page<CopilotOperation> operations = monitoringService.getOperations(pageable);
        return ResponseEntity.ok(operations);
    }
}
