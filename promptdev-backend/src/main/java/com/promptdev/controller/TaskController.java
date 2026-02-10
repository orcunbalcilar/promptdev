package com.promptdev.controller;

import com.promptdev.dto.CreatePullRequestTaskRequest;
import com.promptdev.dto.CreateTaskRequest;
import com.promptdev.dto.TaskEventResponse;
import com.promptdev.dto.TaskResponse;
import com.promptdev.dto.bitbucket.PullRequestResponse;
import com.promptdev.service.TaskService;
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
import java.util.UUID;

/**
 * REST controller for task management.
 */
@RestController
@RequestMapping("/tasks")
@RequiredArgsConstructor
@Slf4j
public class TaskController {

    private final TaskService taskService;

    @PostMapping
    public ResponseEntity<TaskResponse> createTask(@Valid @RequestBody CreateTaskRequest request) {
        log.info("Creating task: {}", request.getTitle());
        TaskResponse response = taskService.createTask(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{taskId}")
    public ResponseEntity<TaskResponse> getTask(@PathVariable UUID taskId) {
        TaskResponse response = taskService.getTask(taskId);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<Page<TaskResponse>> getAllTasks(
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        Page<TaskResponse> tasks = taskService.getAllTasks(pageable);
        return ResponseEntity.ok(tasks);
    }

    @GetMapping("/{taskId}/events")
    public ResponseEntity<List<TaskEventResponse>> getTaskEvents(@PathVariable UUID taskId) {
        List<TaskEventResponse> events = taskService.getTaskEvents(taskId);
        return ResponseEntity.ok(events);
    }

    @PostMapping("/{taskId}/cancel")
    public ResponseEntity<TaskResponse> cancelTask(@PathVariable UUID taskId) {
        log.info("Cancelling task: {}", taskId);
        TaskResponse response = taskService.cancelTask(taskId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{taskId}/retry")
    public ResponseEntity<TaskResponse> retryTask(@PathVariable UUID taskId) {
        log.info("Retrying task: {}", taskId);
        TaskResponse response = taskService.retryTask(taskId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/pending")
    public ResponseEntity<List<TaskResponse>> getPendingTasks() {
        List<TaskResponse> tasks = taskService.getPendingTasks();
        return ResponseEntity.ok(tasks);
    }

    /**
     * Create a pull request for a task after Copilot has pushed code.
     */
    @PostMapping("/{taskId}/create-pr")
    public ResponseEntity<PullRequestResponse> createPullRequest(
            @PathVariable UUID taskId,
            @Valid @RequestBody CreatePullRequestTaskRequest request) {
        log.info("Creating PR for task {}: {} -> {}", taskId, request.branchName(), request.targetBranch());
        PullRequestResponse response = taskService.createPullRequestForTask(taskId, request);
        return ResponseEntity.ok(response);
    }

    /**
     * Start processing a task via Copilot SDK.
     * The frontend Copilot session handles execution directly.
     */
    @PostMapping("/{taskId}/start")
    public ResponseEntity<TaskResponse> startTask(@PathVariable UUID taskId) {
        log.info("Starting task processing: {}", taskId);
        TaskResponse response = taskService.startTask(taskId);
        return ResponseEntity.ok(response);
    }

    /**
     * Resume a completed or failed session with a new prompt.
     * This allows users to continue working on a task with additional instructions.
     */
    @PostMapping("/{taskId}/resume")
    public ResponseEntity<TaskResponse> resumeTask(
            @PathVariable UUID taskId,
            @RequestBody java.util.Map<String, String> body) {
        // Support both "resumePrompt" (frontend convention) and "prompt" (legacy)
        String resumePrompt = body.getOrDefault("resumePrompt", body.get("prompt"));
        if (resumePrompt == null || resumePrompt.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        log.info("Resuming task {}: {}", taskId, resumePrompt);
        TaskResponse response = taskService.resumeTask(taskId, resumePrompt);
        return ResponseEntity.ok(response);
    }
}
