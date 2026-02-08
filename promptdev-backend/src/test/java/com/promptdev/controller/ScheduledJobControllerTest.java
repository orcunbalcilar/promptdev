package com.promptdev.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.promptdev.dto.CreateScheduledJobRequest;
import com.promptdev.dto.ScheduledJobResponse;
import com.promptdev.entity.ScheduledJobType;
import com.promptdev.entity.WorkspaceType;
import com.promptdev.service.ScheduledJobService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;
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

@WebMvcTest(ScheduledJobController.class)
@AutoConfigureMockMvc(addFilters = false)
class ScheduledJobControllerTest {

    private static final String BASE_EP = "/scheduled-jobs";
    private static final String JOB_NAME = "Weekly Code Review";

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private ScheduledJobService scheduledJobService;

    private ScheduledJobResponse buildResponse(UUID id, String name, boolean enabled) {
        return ScheduledJobResponse.builder()
                .id(id)
                .name(name)
                .cronExpression("0 0 9 * * MON")
                .promptTemplate("Review code")
                .jobType(ScheduledJobType.CODE_REVIEW)
                .workspaceType(WorkspaceType.BITBUCKET)
                .workspaceRef("frontend-app")
                .sourceBranch("main")
                .targetBranch("main")
                .modelId("gpt-5.2")
                .enabled(enabled)
                .maxIterations(10)
                .nextRunAt(LocalDateTime.now().plusDays(7))
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    @Nested
    @DisplayName("POST " + BASE_EP)
    class CreateJob {

        @Test
        @DisplayName("should create scheduled job and return 201")
        void shouldCreateJob() throws Exception {
            var request = CreateScheduledJobRequest.builder()
                    .name(JOB_NAME)
                    .cronExpression("0 0 9 * * MON")
                    .promptTemplate("Review all code")
                    .workspaceRef("frontend-app")
                    .jobType(ScheduledJobType.CODE_REVIEW)
                    .workspaceType(WorkspaceType.BITBUCKET)
                    .build();

            UUID jobId = UUID.randomUUID();
            var response = buildResponse(jobId, JOB_NAME, true);

            when(scheduledJobService.createJob(any(CreateScheduledJobRequest.class)))
                    .thenReturn(response);

            mockMvc.perform(post(BASE_EP)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.name").value(JOB_NAME))
                    .andExpect(jsonPath("$.enabled").value(true))
                    .andExpect(jsonPath("$.jobType").value("CODE_REVIEW"));
        }

        @Test
        @DisplayName("should reject request without name")
        void shouldRejectWithoutName() throws Exception {
            var request = CreateScheduledJobRequest.builder()
                    .cronExpression("0 0 2 * * *")
                    .promptTemplate("Do something")
                    .workspaceRef("repo")
                    .build();

            mockMvc.perform(post(BASE_EP)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("should reject request without cron expression")
        void shouldRejectWithoutCron() throws Exception {
            String json = "{\"name\": \"Test\", \"promptTemplate\": \"prompt\", \"workspaceRef\": \"repo\"}";

            mockMvc.perform(post(BASE_EP)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(json))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("GET " + BASE_EP + "/{jobId}")
    class GetJob {

        @Test
        @DisplayName("should return job by ID")
        void shouldReturnJob() throws Exception {
            UUID jobId = UUID.randomUUID();
            var response = buildResponse(jobId, JOB_NAME, true);

            when(scheduledJobService.getJob(jobId)).thenReturn(response);

            mockMvc.perform(get(BASE_EP + "/" + jobId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.name").value(JOB_NAME))
                    .andExpect(jsonPath("$.id").value(jobId.toString()));
        }

        @Test
        @DisplayName("should return error for non-UUID path variable")
        void shouldReturnErrorForInvalidId() throws Exception {
            mockMvc.perform(get(BASE_EP + "/not-a-uuid"))
                    .andExpect(status().isInternalServerError());
        }
    }

    @Nested
    @DisplayName("GET " + BASE_EP)
    class GetAllJobs {

        @Test
        @DisplayName("should return all jobs")
        void shouldReturnAllJobs() throws Exception {
            var job1 = buildResponse(UUID.randomUUID(), JOB_NAME, true);
            var job2 = buildResponse(UUID.randomUUID(), "Daily Scan", false);

            when(scheduledJobService.getAllJobs()).thenReturn(List.of(job1, job2));

            mockMvc.perform(get(BASE_EP))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(2)))
                    .andExpect(jsonPath("$[0].name").value(JOB_NAME))
                    .andExpect(jsonPath("$[1].name").value("Daily Scan"));
        }

        @Test
        @DisplayName("should filter by type when provided")
        void shouldFilterByType() throws Exception {
            var job = buildResponse(UUID.randomUUID(), "Security Job", true);

            when(scheduledJobService.getJobsByType(ScheduledJobType.SECURITY_AUDIT))
                    .thenReturn(List.of(job));

            mockMvc.perform(get(BASE_EP + "?type=SECURITY_AUDIT"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)));

            verify(scheduledJobService).getJobsByType(ScheduledJobType.SECURITY_AUDIT);
        }

        @Test
        @DisplayName("should return empty list when no jobs")
        void shouldReturnEmptyList() throws Exception {
            when(scheduledJobService.getAllJobs()).thenReturn(List.of());

            mockMvc.perform(get(BASE_EP))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(0)));
        }
    }

    @Nested
    @DisplayName("POST " + BASE_EP + "/{jobId}/toggle")
    class ToggleJob {

        @Test
        @DisplayName("should toggle job and return updated state")
        void shouldToggleJob() throws Exception {
            UUID jobId = UUID.randomUUID();
            var response = buildResponse(jobId, JOB_NAME, false);

            when(scheduledJobService.toggleJob(jobId)).thenReturn(response);

            mockMvc.perform(post(BASE_EP + "/" + jobId + "/toggle"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.enabled").value(false));

            verify(scheduledJobService).toggleJob(jobId);
        }
    }

    @Nested
    @DisplayName("DELETE " + BASE_EP + "/{jobId}")
    class DeleteJob {

        @Test
        @DisplayName("should delete job and return 204")
        void shouldDeleteJob() throws Exception {
            UUID jobId = UUID.randomUUID();
            doNothing().when(scheduledJobService).deleteJob(jobId);

            mockMvc.perform(delete(BASE_EP + "/" + jobId))
                    .andExpect(status().isNoContent());

            verify(scheduledJobService).deleteJob(jobId);
        }
    }
}
