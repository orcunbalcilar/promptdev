package com.promptdev.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.promptdev.dto.TaskEventResponse;
import com.promptdev.dto.TaskResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Service for Server-Sent Events (SSE) streaming.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SseService {

    private static final long SSE_TIMEOUT = 30 * 60 * 1000L; // 30 minutes

    private final ObjectMapper objectMapper;

    // Global subscribers for all task updates
    private final CopyOnWriteArrayList<SseEmitter> globalSubscribers = new CopyOnWriteArrayList<>();

    // Task-specific subscribers
    private final Map<UUID, CopyOnWriteArrayList<SseEmitter>> taskSubscribers = new ConcurrentHashMap<>();

    /**
     * Subscribe to all task updates globally.
     */
    public SseEmitter subscribeToAllTasks() {
        SseEmitter emitter = createEmitter();

        emitter.onCompletion(() -> {
            log.debug("Global SSE connection completed");
            globalSubscribers.remove(emitter);
        });

        emitter.onTimeout(() -> {
            log.debug("Global SSE connection timed out");
            globalSubscribers.remove(emitter);
        });

        emitter.onError(e -> {
            log.debug("Global SSE connection error: {}", e.getMessage());
            globalSubscribers.remove(emitter);
        });

        globalSubscribers.add(emitter);

        // Send initial heartbeat
        sendHeartbeat(emitter);

        log.debug("New global SSE subscriber added. Total: {}", globalSubscribers.size());
        return emitter;
    }

    /**
     * Subscribe to updates for a specific task.
     */
    public SseEmitter subscribeToTask(UUID taskId) {
        SseEmitter emitter = createEmitter();

        taskSubscribers.computeIfAbsent(taskId, k -> new CopyOnWriteArrayList<>());
        CopyOnWriteArrayList<SseEmitter> subscribers = taskSubscribers.get(taskId);

        emitter.onCompletion(() -> {
            log.debug("Task {} SSE connection completed", taskId);
            subscribers.remove(emitter);
            cleanupTaskSubscribers(taskId);
        });

        emitter.onTimeout(() -> {
            log.debug("Task {} SSE connection timed out", taskId);
            subscribers.remove(emitter);
            cleanupTaskSubscribers(taskId);
        });

        emitter.onError(e -> {
            log.debug("Task {} SSE connection error: {}", taskId, e.getMessage());
            subscribers.remove(emitter);
            cleanupTaskSubscribers(taskId);
        });

        subscribers.add(emitter);

        // Send initial heartbeat
        sendHeartbeat(emitter);

        log.debug("New subscriber for task {}. Total: {}", taskId, subscribers.size());
        return emitter;
    }

    /**
     * Broadcast task update to all subscribers.
     */
    public void broadcastTaskUpdate(TaskResponse task) {
        sendToEmitters(globalSubscribers, "task-update", task);
    }

    /**
     * Send task event to specific task subscribers.
     */
    public void sendTaskEvent(UUID taskId, TaskEventResponse event) {
        CopyOnWriteArrayList<SseEmitter> subscribers = taskSubscribers.get(taskId);
        if (subscribers != null) {
            sendToEmitters(subscribers, "task-event", event);
        }

        // Also broadcast to global subscribers
        sendToEmitters(globalSubscribers, "task-event", event);
    }

    /**
     * Send heartbeat to all subscribers.
     */
    public void sendHeartbeats() {
        log.trace("Sending heartbeats to {} global and {} task-specific subscriber groups",
                globalSubscribers.size(), taskSubscribers.size());

        for (SseEmitter emitter : globalSubscribers) {
            sendHeartbeat(emitter);
        }

        for (CopyOnWriteArrayList<SseEmitter> subscribers : taskSubscribers.values()) {
            for (SseEmitter emitter : subscribers) {
                sendHeartbeat(emitter);
            }
        }
    }

    private SseEmitter createEmitter() {
        return new SseEmitter(SSE_TIMEOUT);
    }

    private void sendHeartbeat(SseEmitter emitter) {
        try {
            emitter.send(SseEmitter.event()
                    .name("heartbeat")
                    .data("ping"));
        } catch (IOException e) {
            log.trace("Failed to send heartbeat: {}", e.getMessage());
        }
    }

    private void sendToEmitters(CopyOnWriteArrayList<SseEmitter> emitters, String eventName, Object data) {
        if (emitters.isEmpty()) {
            return;
        }

        String jsonData;
        try {
            jsonData = objectMapper.writeValueAsString(data);
        } catch (IOException e) {
            log.error("Failed to serialize event data: {}", e.getMessage());
            return;
        }

        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name(eventName)
                        .data(jsonData));
            } catch (IOException e) {
                log.trace("Failed to send SSE event to emitter: {}", e.getMessage());
                emitters.remove(emitter);
            }
        }
    }

    private void cleanupTaskSubscribers(UUID taskId) {
        CopyOnWriteArrayList<SseEmitter> subscribers = taskSubscribers.get(taskId);
        if (subscribers != null && subscribers.isEmpty()) {
            taskSubscribers.remove(taskId);
        }
    }

    /**
     * Get count of active subscribers.
     */
    public int getActiveSubscriberCount() {
        int count = globalSubscribers.size();
        for (CopyOnWriteArrayList<SseEmitter> subscribers : taskSubscribers.values()) {
            count += subscribers.size();
        }
        return count;
    }
}
