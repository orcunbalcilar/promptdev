package com.promptdev.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.promptdev.dto.MonitoringDashboardResponse;
import com.promptdev.dto.RegisterSessionRequest;
import com.promptdev.dto.TrackOperationRequest;
import com.promptdev.entity.CopilotOperation;
import com.promptdev.entity.CopilotSession;
import com.promptdev.entity.CopilotSessionStatus;
import com.promptdev.entity.OperationType;
import com.promptdev.service.MonitoringService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(MonitoringController.class)
@AutoConfigureMockMvc(addFilters = false)
class MonitoringControllerTest {

    private static final String SDK_ID = "sdk-123";
    private static final String GPT_MODEL = "gpt-5.2";
    private static final String OPS_EP = "/monitoring/operations";
    private static final String SESS_EP = "/monitoring/sessions";

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private MonitoringService monitoringService;

    @Nested
    @DisplayName("GET /monitoring/dashboard")
    class GetDashboard {

        @Test
        @DisplayName("should return dashboard with default 7 days")
        void shouldReturnDashboard() throws Exception {
            var response = MonitoringDashboardResponse.builder()
                    .totalSessions(10L).activeSessions(2L)
                    .totalOperations(100L).totalErrors(3L)
                    .totalInputTokens(5000L).totalOutputTokens(10000L)
                    .operationsByType(Map.of("MESSAGE_SENT", 50L))
                    .sessionsByModel(Map.of(GPT_MODEL, 8L))
                    .sessionsBySource(Map.of("web", 10L))
                    .topTools(List.of()).dailyOperations(List.of()).recentErrors(List.of())
                    .build();

            when(monitoringService.getDashboard(7)).thenReturn(response);

            mockMvc.perform(get("/monitoring/dashboard"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalSessions").value(10))
                    .andExpect(jsonPath("$.activeSessions").value(2))
                    .andExpect(jsonPath("$.totalOperations").value(100))
                    .andExpect(jsonPath("$.totalInputTokens").value(5000))
                    .andExpect(jsonPath("$.totalOutputTokens").value(10000));
        }

        @Test
        @DisplayName("should accept custom days parameter")
        void shouldAcceptCustomDays() throws Exception {
            var response = MonitoringDashboardResponse.builder()
                    .totalSessions(5L).activeSessions(0L)
                    .totalOperations(20L).totalErrors(0L)
                    .totalInputTokens(0L).totalOutputTokens(0L)
                    .operationsByType(Map.of()).sessionsByModel(Map.of())
                    .sessionsBySource(Map.of())
                    .topTools(List.of()).dailyOperations(List.of()).recentErrors(List.of())
                    .build();

            when(monitoringService.getDashboard(30)).thenReturn(response);

            mockMvc.perform(get("/monitoring/dashboard?days=30"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalSessions").value(5));

            verify(monitoringService).getDashboard(30);
        }
    }

    @Nested
    @DisplayName("POST " + SESS_EP)
    class RegisterSession {

        @Test
        @DisplayName("should register session and return 201")
        void shouldRegisterSession() throws Exception {
            var request = RegisterSessionRequest.builder()
                    .sdkSessionId(SDK_ID).model(GPT_MODEL)
                    .reasoningEffort("medium").source("web").build();

            var session = CopilotSession.builder()
                    .id(UUID.randomUUID()).sdkSessionId(SDK_ID)
                    .model(GPT_MODEL).status(CopilotSessionStatus.ACTIVE).build();

            when(monitoringService.registerSession(any(RegisterSessionRequest.class)))
                    .thenReturn(session);

            mockMvc.perform(post(SESS_EP)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.sdkSessionId").value(SDK_ID))
                    .andExpect(jsonPath("$.status").value("ACTIVE"));
        }
    }

    @Nested
    @DisplayName("DELETE " + SESS_EP + "/{sdkSessionId}")
    class EndSession {

        @Test
        @DisplayName("should end session and return 204")
        void shouldEndSession() throws Exception {
            doNothing().when(monitoringService).endSession(SDK_ID);

            mockMvc.perform(delete(SESS_EP + "/" + SDK_ID))
                    .andExpect(status().isNoContent());

            verify(monitoringService).endSession(SDK_ID);
        }
    }

    @Nested
    @DisplayName("GET " + SESS_EP)
    class GetSessions {

        @Test
        @DisplayName("should return paginated sessions")
        void shouldReturnPaginatedSessions() throws Exception {
            var session = CopilotSession.builder()
                    .id(UUID.randomUUID()).sdkSessionId(SDK_ID)
                    .model(GPT_MODEL).status(CopilotSessionStatus.ACTIVE)
                    .source("web").totalInputTokens(0L).totalOutputTokens(0L)
                    .messageCount(0).toolExecutionCount(0).errorCount(0)
                    .operations(new ArrayList<>()).createdAt(LocalDateTime.now())
                    .build();

            when(monitoringService.getSessions(any(Pageable.class)))
                    .thenReturn(new PageImpl<>(List.of(session)));

            mockMvc.perform(get(SESS_EP))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)))
                    .andExpect(jsonPath("$.content[0].sdkSessionId").value(SDK_ID));
        }
    }

    @Nested
    @DisplayName("POST " + OPS_EP)
    class TrackOperation {

        @Test
        @DisplayName("should track operation and return 201")
        void shouldTrackOperation() throws Exception {
            var request = TrackOperationRequest.builder()
                    .operationType(OperationType.MESSAGE_SENT)
                    .message("Hello").source("web").build();

            var operation = CopilotOperation.builder()
                    .id(UUID.randomUUID())
                    .operationType(OperationType.MESSAGE_SENT).build();

            when(monitoringService.trackOperation(any(TrackOperationRequest.class)))
                    .thenReturn(operation);

            mockMvc.perform(post(OPS_EP)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").exists());
        }

        @Test
        @DisplayName("should reject operation without operationType")
        void shouldRejectWithoutType() throws Exception {
            mockMvc.perform(post(OPS_EP)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"message\":\"test\"}"))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("POST " + OPS_EP + "/batch")
    class TrackOperationsBatch {

        @Test
        @DisplayName("should track batch operations and return 201")
        void shouldTrackBatch() throws Exception {
            var requests = List.of(
                    TrackOperationRequest.builder().operationType(OperationType.MESSAGE_SENT).build(),
                    TrackOperationRequest.builder().operationType(OperationType.MESSAGE_RECEIVED).build());

            var operations = List.of(
                    CopilotOperation.builder().id(UUID.randomUUID()).operationType(OperationType.MESSAGE_SENT).build(),
                    CopilotOperation.builder().id(UUID.randomUUID()).operationType(OperationType.MESSAGE_RECEIVED).build());

            when(monitoringService.trackOperations(any())).thenReturn(operations);

            mockMvc.perform(post(OPS_EP + "/batch")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(requests)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.count").value(2));
        }
    }

    @Nested
    @DisplayName("GET " + SESS_EP + "/{sdkSessionId}/operations")
    class GetSessionOperations {

        @Test
        @DisplayName("should return operations for session")
        void shouldReturnSessionOperations() throws Exception {
            var operation = CopilotOperation.builder()
                    .id(UUID.randomUUID())
                    .operationType(OperationType.MESSAGE_SENT)
                    .message("Hello agent")
                    .timestamp(LocalDateTime.now()).build();

            when(monitoringService.getSessionOperations(SDK_ID))
                    .thenReturn(List.of(operation));

            mockMvc.perform(get(SESS_EP + "/" + SDK_ID + "/operations"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)))
                    .andExpect(jsonPath("$[0].operationType").value("MESSAGE_SENT"));
        }
    }

    @Nested
    @DisplayName("GET " + OPS_EP)
    class GetOperations {

        @Test
        @DisplayName("should return paginated operations")
        void shouldReturnPaginatedOperations() throws Exception {
            var operation = CopilotOperation.builder()
                    .id(UUID.randomUUID())
                    .operationType(OperationType.TOOL_EXECUTION_START)
                    .toolName("createFile")
                    .timestamp(LocalDateTime.now()).build();

            when(monitoringService.getOperations(any(Pageable.class)))
                    .thenReturn(new PageImpl<>(List.of(operation)));

            mockMvc.perform(get(OPS_EP))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)))
                    .andExpect(jsonPath("$.content[0].toolName").value("createFile"));
        }
    }
}
