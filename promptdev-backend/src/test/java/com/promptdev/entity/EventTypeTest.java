package com.promptdev.entity;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.promptdev.dto.AgentCallbackRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.*;

class EventTypeTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Nested
    @DisplayName("EventType enum values")
    class EnumValues {

        @Test
        @DisplayName("should include PROGRESS event type")
        void shouldIncludeProgress() {
            assertThat(EventType.valueOf("PROGRESS")).isEqualTo(EventType.PROGRESS);
        }

        @ParameterizedTest
        @EnumSource(EventType.class)
        @DisplayName("should deserialize all enum values from string")
        void shouldDeserializeAllValues(EventType eventType) throws Exception {
            String json = String.format("{\"eventType\":\"%s\"}", eventType.name());
            AgentCallbackRequest request = objectMapper.readValue(json, AgentCallbackRequest.class);
            assertThat(request.getEventType()).isEqualTo(eventType);
        }
    }

    @Nested
    @DisplayName("EventType deserialization")
    class Deserialization {

        @Test
        @DisplayName("should deserialize PROGRESS from JSON")
        void shouldDeserializeProgress() throws Exception {
            String json = "{\"eventType\":\"PROGRESS\",\"message\":\"Working on it...\"}";
            AgentCallbackRequest request = objectMapper.readValue(json, AgentCallbackRequest.class);
            assertThat(request.getEventType()).isEqualTo(EventType.PROGRESS);
            assertThat(request.getMessage()).isEqualTo("Working on it...");
        }

        @ParameterizedTest
        @ValueSource(strings = {
                "TASK_CREATED", "AGENT_STARTED", "CODE_GENERATING",
                "GIT_COMMIT", "PR_CREATED", "TASK_COMPLETED",
                "PROGRESS", "ERROR", "LOG"
        })
        @DisplayName("should deserialize common event types from JSON callback")
        void shouldDeserializeCommonEventTypes(String eventTypeName) throws Exception {
            String json = String.format("{\"eventType\":\"%s\"}", eventTypeName);
            AgentCallbackRequest request = objectMapper.readValue(json, AgentCallbackRequest.class);
            assertThat(request.getEventType()).isNotNull();
            assertThat(request.getEventType().name()).isEqualTo(eventTypeName);
        }

        @Test
        @DisplayName("should throw when deserializing invalid event type")
        void shouldThrowForInvalidEventType() {
            String json = "{\"eventType\":\"NONEXISTENT_TYPE\"}";
            assertThatThrownBy(() -> objectMapper.readValue(json, AgentCallbackRequest.class))
                    .isInstanceOf(Exception.class);
        }
    }
}
