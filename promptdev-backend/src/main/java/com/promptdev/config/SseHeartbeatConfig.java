package com.promptdev.config;

import com.promptdev.service.SseService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.Scheduled;

/**
 * Configuration for SSE heartbeat scheduling.
 */
@Configuration
@RequiredArgsConstructor
public class SseHeartbeatConfig {

    private final SseService sseService;

    @Scheduled(fixedRateString = "${promptdev.sse.heartbeat-interval:15000}")
    public void sendHeartbeats() {
        sseService.sendHeartbeats();
    }
}
