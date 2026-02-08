package com.promptdev.controller;

import com.promptdev.dto.AgentCallbackRequest;
import com.promptdev.dto.TaskResponse;
import com.promptdev.service.SseService;
import com.promptdev.service.TaskService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.UUID;

/**
 * REST controller for SSE streaming endpoints.
 */
@RestController
@RequestMapping("/stream")
@RequiredArgsConstructor
@Slf4j
public class SseController {

    private final SseService sseService;
    private final TaskService taskService;

    /**
     * Subscribe to all task updates.
     */
    @GetMapping(value = "/tasks", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribeToAllTasks() {
        log.info("New SSE subscription for all tasks");
        return sseService.subscribeToAllTasks();
    }

    /**
     * Subscribe to updates for a specific task.
     */
    @GetMapping(value = "/tasks/{taskId}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribeToTask(@PathVariable UUID taskId) {
        log.info("New SSE subscription for task: {}", taskId);
        return sseService.subscribeToTask(taskId);
    }

    /**
     * Callback endpoint for Copilot agent to report task progress.
     */
    @PostMapping("/callback")
    public ResponseEntity<TaskResponse> agentCallback(@Valid @RequestBody AgentCallbackRequest request) {
        log.info("Received callback for task {}: {}", request.getTaskId(), request.getEventType());
        TaskResponse response = taskService.processAgentCallback(request);
        return ResponseEntity.ok(response);
    }
}
