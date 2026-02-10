package com.promptdev.exception;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.context.request.async.AsyncRequestNotUsableException;

import java.util.Map;

import static org.assertj.core.api.Assertions.*;

class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler handler;

    @BeforeEach
    void setUp() {
        handler = new GlobalExceptionHandler();
    }

    @Nested
    @DisplayName("handleAsyncRequestNotUsable")
    class HandleAsyncRequestNotUsable {

        @Test
        @DisplayName("should return void (no response body) for disconnected SSE client")
        void shouldReturnVoidForDisconnectedClient() {
            var exception = new AsyncRequestNotUsableException("Client disconnected");

            // Should not throw and returns void
            assertThatCode(() -> handler.handleAsyncRequestNotUsable(exception))
                    .doesNotThrowAnyException();
        }
    }

    @Nested
    @DisplayName("handleIllegalArgument")
    class HandleIllegalArgument {

        @Test
        @DisplayName("should return 404 with error message")
        void shouldReturn404() {
            var exception = new IllegalArgumentException("Task not found");

            ResponseEntity<Map<String, Object>> response = handler.handleIllegalArgument(exception);

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
            assertThat(response.getBody()).containsEntry("message", "Task not found");
            assertThat(response.getBody()).containsEntry("status", 404);
        }
    }

    @Nested
    @DisplayName("handleIllegalState")
    class HandleIllegalState {

        @Test
        @DisplayName("should return 400 with error message")
        void shouldReturn400() {
            var exception = new IllegalStateException("Invalid task state");

            ResponseEntity<Map<String, Object>> response = handler.handleIllegalState(exception);

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
            assertThat(response.getBody()).containsEntry("message", "Invalid task state");
            assertThat(response.getBody()).containsEntry("status", 400);
        }
    }

    @Nested
    @DisplayName("handleGenericException")
    class HandleGenericException {

        @Test
        @DisplayName("should return 500 with generic message")
        void shouldReturn500() {
            var exception = new RuntimeException("Something unexpected");

            ResponseEntity<Map<String, Object>> response = handler.handleGenericException(exception);

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
            assertThat(response.getBody()).containsEntry("message", "An unexpected error occurred");
            assertThat(response.getBody()).containsEntry("status", 500);
        }

        @Test
        @DisplayName("should include timestamp in response")
        void shouldIncludeTimestamp() {
            var exception = new RuntimeException("Error");

            ResponseEntity<Map<String, Object>> response = handler.handleGenericException(exception);

            assertThat(response.getBody()).containsKey("timestamp");
        }

        @Test
        @DisplayName("should include error reason phrase in response")
        void shouldIncludeErrorPhrase() {
            var exception = new RuntimeException("Error");

            ResponseEntity<Map<String, Object>> response = handler.handleGenericException(exception);

            assertThat(response.getBody()).containsEntry("error", "Internal Server Error");
        }
    }
}
