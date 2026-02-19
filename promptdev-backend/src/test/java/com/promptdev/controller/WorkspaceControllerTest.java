package com.promptdev.controller;

import com.promptdev.config.BitbucketConfig;
import com.promptdev.service.BitbucketService;
import com.promptdev.service.WorkspaceService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.io.IOException;
import java.util.UUID;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(WorkspaceController.class)
@AutoConfigureMockMvc(addFilters = false)
class WorkspaceControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private WorkspaceService workspaceService;

    @MockitoBean
    private BitbucketService bitbucketService;

    @MockitoBean
    private BitbucketConfig bitbucketConfig;

    @Nested
    @DisplayName("POST /workspaces/{taskId}")
    class CreateWorkspace {

        @Test
        @DisplayName("should create workspace and return 201")
        void shouldCreateWorkspace() throws Exception {
            UUID taskId = UUID.randomUUID();
            String expectedPath = "/tmp/promptdev-workspaces/" + taskId;

            when(workspaceService.createWorkspace(taskId)).thenReturn(expectedPath);

            mockMvc.perform(post("/workspaces/" + taskId))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.taskId").value(taskId.toString()))
                    .andExpect(jsonPath("$.path").value(expectedPath))
                    .andExpect(jsonPath("$.exists").value(true));

            verify(workspaceService).createWorkspace(taskId);
        }

        @Test
        @DisplayName("should return 500 when workspace creation fails")
        void shouldReturn500WhenCreationFails() throws Exception {
            UUID taskId = UUID.randomUUID();

            when(workspaceService.createWorkspace(taskId))
                    .thenThrow(new IOException("Permission denied"));

            mockMvc.perform(post("/workspaces/" + taskId))
                    .andExpect(status().isInternalServerError())
                    .andExpect(jsonPath("$.error").value("Failed to create workspace"))
                    .andExpect(jsonPath("$.message").value("Workspace creation failed. Contact administrator."));
        }
    }

    @Nested
    @DisplayName("GET /workspaces/{taskId}")
    class GetWorkspace {

        @Test
        @DisplayName("should return workspace info when exists")
        void shouldReturnWorkspaceInfo() throws Exception {
            UUID taskId = UUID.randomUUID();
            String expectedPath = "/tmp/promptdev-workspaces/" + taskId;

            when(workspaceService.workspaceExists(taskId)).thenReturn(true);
            when(workspaceService.getWorkspacePath(taskId)).thenReturn(expectedPath);
            when(workspaceService.getWorkspaceSizeMb(taskId)).thenReturn(42L);
            when(workspaceService.isWithinSizeLimit(taskId)).thenReturn(true);

            mockMvc.perform(get("/workspaces/" + taskId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.taskId").value(taskId.toString()))
                    .andExpect(jsonPath("$.path").value(expectedPath))
                    .andExpect(jsonPath("$.exists").value(true))
                    .andExpect(jsonPath("$.sizeMb").value(42))
                    .andExpect(jsonPath("$.withinSizeLimit").value(true));
        }

        @Test
        @DisplayName("should return 404 when workspace does not exist")
        void shouldReturn404WhenNotExists() throws Exception {
            UUID taskId = UUID.randomUUID();

            when(workspaceService.workspaceExists(taskId)).thenReturn(false);

            mockMvc.perform(get("/workspaces/" + taskId))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.taskId").value(taskId.toString()))
                    .andExpect(jsonPath("$.exists").value(false));
        }

        @Test
        @DisplayName("should return 500 when getting workspace info fails")
        void shouldReturn500WhenGetFails() throws Exception {
            UUID taskId = UUID.randomUUID();

            when(workspaceService.workspaceExists(taskId)).thenReturn(true);
            when(workspaceService.getWorkspacePath(taskId)).thenReturn("/tmp/test");
            when(workspaceService.getWorkspaceSizeMb(taskId))
                    .thenThrow(new IOException("Disk error"));

            mockMvc.perform(get("/workspaces/" + taskId))
                    .andExpect(status().isInternalServerError())
                    .andExpect(jsonPath("$.error").value("Failed to get workspace info"));
        }
    }

    @Nested
    @DisplayName("DELETE /workspaces/{taskId}")
    class DeleteWorkspace {

        @Test
        @DisplayName("should delete workspace and return 200")
        void shouldDeleteWorkspace() throws Exception {
            UUID taskId = UUID.randomUUID();

            doNothing().when(workspaceService).cleanupWorkspace(taskId);

            mockMvc.perform(delete("/workspaces/" + taskId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.taskId").value(taskId.toString()))
                    .andExpect(jsonPath("$.deleted").value(true));

            verify(workspaceService).cleanupWorkspace(taskId);
        }
    }

    @Nested
    @DisplayName("POST /workspaces/{taskId}/clone")
    class CloneRepository {

        @Test
        @DisplayName("should clone repository and return 200")
        void shouldCloneRepository() throws Exception {
            UUID taskId = UUID.randomUUID();
            String expectedPath = "/tmp/promptdev-workspaces/" + taskId;
            String cloneUrl = "https://bitbucket.example.com/scm/proj/repo.git";

            when(bitbucketService.getCloneUrl("PROJ", "my-repo")).thenReturn(cloneUrl);
            when(bitbucketConfig.getUsername()).thenReturn("user");
            when(bitbucketConfig.getToken()).thenReturn("token123");
            when(workspaceService.cloneRepository(taskId, cloneUrl, "user", "token123", "feature/branch"))
                    .thenReturn(expectedPath);

            mockMvc.perform(post("/workspaces/" + taskId + "/clone")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                {"projectKey":"PROJ","repoSlug":"my-repo","sourceBranch":"feature/branch"}
                                """))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.taskId").value(taskId.toString()))
                    .andExpect(jsonPath("$.path").value(expectedPath))
                    .andExpect(jsonPath("$.cloned").value(true));

            verify(workspaceService).cloneRepository(taskId, cloneUrl, "user", "token123", "feature/branch");
        }

        @Test
        @DisplayName("should return 400 when required fields are missing")
        void shouldReturn400WhenFieldsMissing() throws Exception {
            UUID taskId = UUID.randomUUID();

            mockMvc.perform(post("/workspaces/" + taskId + "/clone")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                {"projectKey":"PROJ"}
                                """))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error").exists());
        }

        @Test
        @DisplayName("should return 500 when clone fails")
        void shouldReturn500WhenCloneFails() throws Exception {
            UUID taskId = UUID.randomUUID();
            String cloneUrl = "https://bitbucket.example.com/scm/proj/repo.git";

            when(bitbucketService.getCloneUrl("PROJ", "my-repo")).thenReturn(cloneUrl);
            when(bitbucketConfig.getUsername()).thenReturn("user");
            when(bitbucketConfig.getToken()).thenReturn("token123");
            when(workspaceService.cloneRepository(taskId, cloneUrl, "user", "token123", "main"))
                    .thenThrow(new IOException("Clone failed: repository not found"));

            mockMvc.perform(post("/workspaces/" + taskId + "/clone")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                {"projectKey":"PROJ","repoSlug":"my-repo","sourceBranch":"main"}
                                """))
                    .andExpect(status().isInternalServerError())
                    .andExpect(jsonPath("$.error").value("Failed to clone repository"))
                    .andExpect(jsonPath("$.message").exists());
        }
    }
}
