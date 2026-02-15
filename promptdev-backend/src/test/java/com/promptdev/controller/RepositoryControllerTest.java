package com.promptdev.controller;

import com.promptdev.config.BitbucketConfig;
import com.promptdev.dto.bitbucket.BranchResponse;
import com.promptdev.dto.bitbucket.ProjectResponse;
import com.promptdev.dto.bitbucket.RepositoryResponse;
import com.promptdev.service.BitbucketService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.List;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(RepositoryController.class)
@AutoConfigureMockMvc(addFilters = false)
class RepositoryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private BitbucketService bitbucketService;

    @MockitoBean
    private BitbucketConfig bitbucketConfig;

    private ProjectResponse buildProject(String key, String name) {
        return new ProjectResponse(1L, key, name, "Description", true, "NORMAL", Collections.emptyMap());
    }

    private RepositoryResponse buildRepo(String slug, String name, String projectKey) {
        var project = new RepositoryResponse.ProjectResponse(projectKey, projectKey + " Project");
        return new RepositoryResponse(1L, slug, name, "desc", "AVAILABLE", true, project, Collections.emptyMap());
    }

    private BranchResponse buildBranch(String displayId, boolean isDefault) {
        return new BranchResponse("refs/heads/" + displayId, displayId, "BRANCH", null, isDefault);
    }

    @Nested
    @DisplayName("GET /projects")
    class ListProjects {

        @Test
        @DisplayName("should return all projects")
        void shouldReturnAllProjects() throws Exception {
            var prj1 = buildProject("PRJ1", "Project One");
            var prj2 = buildProject("PRJ2", "Project Two");

            when(bitbucketService.listProjects()).thenReturn(List.of(prj1, prj2));

            mockMvc.perform(get("/projects"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(2)))
                    .andExpect(jsonPath("$[0].key").value("PRJ1"))
                    .andExpect(jsonPath("$[0].name").value("Project One"))
                    .andExpect(jsonPath("$[1].key").value("PRJ2"));
        }

        @Test
        @DisplayName("should return empty list when no projects")
        void shouldReturnEmptyList() throws Exception {
            when(bitbucketService.listProjects()).thenReturn(List.of());

            mockMvc.perform(get("/projects"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(0)));
        }
    }

    @Nested
    @DisplayName("GET /projects/{projectKey}/repositories")
    class ListRepositoriesByProject {

        @Test
        @DisplayName("should return repositories for a specific project")
        void shouldReturnReposByProject() throws Exception {
            var repo1 = buildRepo("frontend", "Frontend App", "PRJ1");
            var repo2 = buildRepo("backend", "Backend API", "PRJ1");

            when(bitbucketService.listRepositories("PRJ1")).thenReturn(List.of(repo1, repo2));

            mockMvc.perform(get("/projects/PRJ1/repositories"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(2)))
                    .andExpect(jsonPath("$[0].slug").value("frontend"))
                    .andExpect(jsonPath("$[1].slug").value("backend"));

            verify(bitbucketService).listRepositories("PRJ1");
        }
    }

    @Nested
    @DisplayName("GET /repositories")
    class ListRepositories {

        @Test
        @DisplayName("should use explicit projectKey query param")
        void shouldUseExplicitProjectKey() throws Exception {
            var repo = buildRepo("my-repo", "My Repo", "CUSTOM");

            when(bitbucketService.listRepositories("CUSTOM")).thenReturn(List.of(repo));

            mockMvc.perform(get("/repositories").param("projectKey", "CUSTOM"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)))
                    .andExpect(jsonPath("$[0].slug").value("my-repo"));

            verify(bitbucketService).listRepositories("CUSTOM");
        }

        @Test
        @DisplayName("should fall back to global config project key when no query param")
        void shouldFallBackToGlobalConfig() throws Exception {
            var repo = buildRepo("repo", "Repo", "DEFAULT");

            when(bitbucketConfig.getProjectKey()).thenReturn("DEFAULT");
            when(bitbucketService.listRepositories("DEFAULT")).thenReturn(List.of(repo));

            mockMvc.perform(get("/repositories"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)));

            verify(bitbucketService).listRepositories("DEFAULT");
        }

        @Test
        @DisplayName("should list all repos across projects when no project key configured")
        void shouldListAllReposWhenNoProjectKey() throws Exception {
            when(bitbucketConfig.getProjectKey()).thenReturn("");

            var repo1 = buildRepo("repo1", "Repo 1", "PRJ1");
            var repo2 = buildRepo("repo2", "Repo 2", "PRJ2");

            when(bitbucketService.listAllRepositories()).thenReturn(List.of(repo1, repo2));

            mockMvc.perform(get("/repositories"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(2)));

            verify(bitbucketService).listAllRepositories();
        }
    }

    @Nested
    @DisplayName("GET /repositories/{repoSlug}/branches")
    class ListBranches {

        @Test
        @DisplayName("should list branches with explicit project key")
        void shouldListBranchesWithProjectKey() throws Exception {
            var main = buildBranch("main", true);
            var develop = buildBranch("develop", false);

            when(bitbucketService.listBranches("PRJ", "my-repo", null))
                    .thenReturn(List.of(main, develop));

            mockMvc.perform(get("/repositories/my-repo/branches").param("projectKey", "PRJ"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(2)))
                    .andExpect(jsonPath("$[0].displayId").value("main"))
                    .andExpect(jsonPath("$[0].isDefault").value(true));

            verify(bitbucketService).listBranches("PRJ", "my-repo", null);
        }

        @Test
        @DisplayName("should fall back to config project key when not specified")
        void shouldFallBackToConfigForBranches() throws Exception {
            when(bitbucketConfig.getProjectKey()).thenReturn("GLOBAL");
            when(bitbucketService.listBranches("GLOBAL", "repo", null))
                    .thenReturn(List.of(buildBranch("main", true)));

            mockMvc.perform(get("/repositories/repo/branches"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)));

            verify(bitbucketService).listBranches("GLOBAL", "repo", null);
        }

        @Test
        @DisplayName("should pass filter parameter to service")
        void shouldPassFilterParam() throws Exception {
            when(bitbucketService.listBranches("PRJ", "repo", "feat"))
                    .thenReturn(List.of(buildBranch("feature/login", false)));

            mockMvc.perform(get("/repositories/repo/branches")
                            .param("projectKey", "PRJ")
                            .param("filter", "feat"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)))
                    .andExpect(jsonPath("$[0].displayId").value("feature/login"));
        }
    }

    @Nested
    @DisplayName("GET /repositories/{repoSlug}/default-branch")
    class GetDefaultBranch {

        @Test
        @DisplayName("should return default branch with project key")
        void shouldReturnDefaultBranch() throws Exception {
            var main = buildBranch("main", true);

            when(bitbucketService.getDefaultBranch("PRJ", "repo")).thenReturn(main);

            mockMvc.perform(get("/repositories/repo/default-branch").param("projectKey", "PRJ"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.displayId").value("main"))
                    .andExpect(jsonPath("$.isDefault").value(true));
        }
    }

    @Nested
    @DisplayName("GET /repositories/{repoSlug}/clone-url")
    class GetCloneUrl {

        @Test
        @DisplayName("should return clone URL with project key")
        void shouldReturnCloneUrl() throws Exception {
            when(bitbucketService.getCloneUrl("PRJ", "repo"))
                    .thenReturn("https://bitbucket.example.com/scm/prj/repo.git");

            mockMvc.perform(get("/repositories/repo/clone-url").param("projectKey", "PRJ"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.cloneUrl").value("https://bitbucket.example.com/scm/prj/repo.git"));
        }
    }
}
