package com.promptdev.entity;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

class CopilotSessionTest {

    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }

    @Nested
    @DisplayName("JSON serialization")
    class JsonSerialization {

        @Test
        @DisplayName("should not serialize task field (JsonIgnore)")
        void shouldNotSerializeTask() throws Exception {
            Task task = Task.builder()
                    .id(UUID.randomUUID())
                    .title("Test Task")
                    .build();

            CopilotSession session = CopilotSession.builder()
                    .id(UUID.randomUUID())
                    .sdkSessionId("test-session-id")
                    .model("gpt-5-mini")
                    .status(CopilotSessionStatus.ACTIVE)
                    .task(task)
                    .totalInputTokens(100L)
                    .totalOutputTokens(200L)
                    .messageCount(5)
                    .toolExecutionCount(3)
                    .errorCount(0)
                    .source("web")
                    .operations(new ArrayList<>())
                    .createdAt(LocalDateTime.now())
                    .build();

            String json = objectMapper.writeValueAsString(session);

            assertThat(json).doesNotContain("\"task\"");
            assertThat(json).doesNotContain("Test Task");
            assertThat(json).contains("\"sdkSessionId\"");
            assertThat(json).contains("test-session-id");
            assertThat(json).contains("\"model\"");
        }

        @Test
        @DisplayName("should not serialize operations field (JsonIgnore)")
        void shouldNotSerializeOperations() throws Exception {
            CopilotSession session = CopilotSession.builder()
                    .id(UUID.randomUUID())
                    .sdkSessionId("test-session-id")
                    .model("gpt-5-mini")
                    .status(CopilotSessionStatus.ACTIVE)
                    .totalInputTokens(0L)
                    .totalOutputTokens(0L)
                    .messageCount(0)
                    .toolExecutionCount(0)
                    .errorCount(0)
                    .source("web")
                    .operations(new ArrayList<>())
                    .createdAt(LocalDateTime.now())
                    .build();

            String json = objectMapper.writeValueAsString(session);

            assertThat(json).doesNotContain("\"operations\"");
            assertThat(json).contains("\"sdkSessionId\"");
        }

        @Test
        @DisplayName("should serialize all non-ignored fields")
        void shouldSerializeNonIgnoredFields() throws Exception {
            UUID sessionId = UUID.randomUUID();
            CopilotSession session = CopilotSession.builder()
                    .id(sessionId)
                    .sdkSessionId("sdk-abc-123")
                    .model("gpt-5.2")
                    .status(CopilotSessionStatus.ACTIVE)
                    .totalInputTokens(500L)
                    .totalOutputTokens(1000L)
                    .messageCount(10)
                    .toolExecutionCount(5)
                    .errorCount(1)
                    .source("slack")
                    .operations(new ArrayList<>())
                    .createdAt(LocalDateTime.now())
                    .build();

            String json = objectMapper.writeValueAsString(session);

            assertThat(json)
                    .contains("\"sdkSessionId\":\"sdk-abc-123\"")
                    .contains("\"model\":\"gpt-5.2\"")
                    .contains("\"status\":\"ACTIVE\"")
                    .contains("\"totalInputTokens\":500")
                    .contains("\"totalOutputTokens\":1000")
                    .contains("\"messageCount\":10")
                    .contains("\"toolExecutionCount\":5")
                    .contains("\"errorCount\":1")
                    .contains("\"source\":\"slack\"");
        }
    }
}
