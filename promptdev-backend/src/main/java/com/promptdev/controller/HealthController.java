package com.promptdev.controller;

import com.promptdev.entity.TaskStatus;
import com.promptdev.service.SseService;
import com.promptdev.service.TaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * REST controller for system health and metrics.
 */
@RestController
@RequestMapping("/health")
@RequiredArgsConstructor
public class HealthController {

    private final TaskService taskService;
    private final SseService sseService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "timestamp", System.currentTimeMillis()
        ));
    }

    @GetMapping("/metrics")
    public ResponseEntity<Map<String, Object>> metrics() {
        return ResponseEntity.ok(Map.of(
                "tasks", Map.of(
                        "pending", taskService.countByStatus(TaskStatus.PENDING),
                        "inProgress", taskService.countByStatus(TaskStatus.IN_PROGRESS),
                        "completed", taskService.countByStatus(TaskStatus.COMPLETED),
                        "failed", taskService.countByStatus(TaskStatus.FAILED)
                ),
                "sse", Map.of(
                        "activeSubscribers", sseService.getActiveSubscriberCount()
                )
        ));
    }
}
