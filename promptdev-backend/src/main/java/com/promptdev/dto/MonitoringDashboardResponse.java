package com.promptdev.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * Response DTO for monitoring dashboard metrics.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MonitoringDashboardResponse {

    // Summary counts
    private long totalSessions;
    private long activeSessions;
    private long totalOperations;
    private long totalErrors;

    // Token usage
    private long totalInputTokens;
    private long totalOutputTokens;

    // Breakdowns
    private Map<String, Long> operationsByType;
    private Map<String, Long> sessionsByModel;
    private Map<String, Long> sessionsBySource;

    // Tool usage
    private List<ToolUsageStat> topTools;

    // Daily trends
    private List<DailyCount> dailyOperations;

    // Recent errors
    private List<OperationSummary> recentErrors;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ToolUsageStat {
        private String toolName;
        private long executionCount;
        private double avgDurationMs;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DailyCount {
        private String date;
        private long count;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class OperationSummary {
        private String id;
        private String operationType;
        private String message;
        private String errorMessage;
        private String timestamp;
        private String sessionId;
    }
}
