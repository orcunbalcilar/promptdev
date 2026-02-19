package com.promptdev.service;

import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class WorkspaceServiceTest {

    private WorkspaceService workspaceService;

    @TempDir
    Path tempDir;

    @BeforeEach
    void setUp() {
        workspaceService = new WorkspaceService();
        ReflectionTestUtils.setField(workspaceService, "basePath", tempDir.toString());
        ReflectionTestUtils.setField(workspaceService, "maxSizeMb", 500);
        ReflectionTestUtils.setField(workspaceService, "cloneTimeoutSeconds", 300);
    }

    @Nested
    @DisplayName("createWorkspace")
    class CreateWorkspace {

        @Test
        @DisplayName("should create workspace directory for task")
        void shouldCreateWorkspaceDirectory() throws IOException {
            UUID taskId = UUID.randomUUID();

            String path = workspaceService.createWorkspace(taskId);

            assertThat(path).isNotNull();
            assertThat(Files.exists(Path.of(path))).isTrue();
            assertThat(Files.isDirectory(Path.of(path))).isTrue();
            assertThat(path).contains(taskId.toString());
        }

        @Test
        @DisplayName("should cleanup and recreate when workspace already exists")
        void shouldCleanupAndRecreateExistingWorkspace() throws IOException {
            UUID taskId = UUID.randomUUID();

            // Create workspace first
            String firstPath = workspaceService.createWorkspace(taskId);
            Files.writeString(Path.of(firstPath, "testfile.txt"), "content");

            // Create again - should not throw
            String secondPath = workspaceService.createWorkspace(taskId);

            assertThat(secondPath).isEqualTo(firstPath);
            assertThat(Files.exists(Path.of(secondPath))).isTrue();
            // The old file should be gone since cleanupWorkspace was called
            assertThat(Files.exists(Path.of(secondPath, "testfile.txt"))).isFalse();
        }

        @Test
        @DisplayName("should return absolute path")
        void shouldReturnAbsolutePath() throws IOException {
            UUID taskId = UUID.randomUUID();

            String path = workspaceService.createWorkspace(taskId);

            assertThat(Path.of(path).isAbsolute()).isTrue();
        }
    }

    @Nested
    @DisplayName("createRepoDirectory")
    class CreateRepoDirectory {

        @Test
        @DisplayName("should create repo subdirectory within workspace")
        void shouldCreateRepoDirectory() throws IOException {
            UUID taskId = UUID.randomUUID();
            workspaceService.createWorkspace(taskId);

            String repoPath = workspaceService.createRepoDirectory(taskId, "my-repo");

            assertThat(repoPath).isNotNull();
            assertThat(Files.exists(Path.of(repoPath))).isTrue();
            assertThat(repoPath).contains(taskId.toString());
            assertThat(repoPath).contains("my-repo");
        }

        @Test
        @DisplayName("should create repo directory even without parent workspace")
        void shouldCreateRepoDirectoryWithoutParent() throws IOException {
            UUID taskId = UUID.randomUUID();

            String repoPath = workspaceService.createRepoDirectory(taskId, "new-repo");

            assertThat(Files.exists(Path.of(repoPath))).isTrue();
        }
    }

    @Nested
    @DisplayName("getWorkspacePath")
    class GetWorkspacePath {

        @Test
        @DisplayName("should return correct path for task")
        void shouldReturnCorrectPath() {
            UUID taskId = UUID.randomUUID();

            String path = workspaceService.getWorkspacePath(taskId);

            assertThat(path).isNotNull();
            assertThat(path).contains(taskId.toString());
            assertThat(path).contains(tempDir.toString());
        }

        @Test
        @DisplayName("should return absolute path")
        void shouldReturnAbsolutePath() {
            UUID taskId = UUID.randomUUID();

            String path = workspaceService.getWorkspacePath(taskId);

            assertThat(Path.of(path).isAbsolute()).isTrue();
        }
    }

    @Nested
    @DisplayName("getRepoPath")
    class GetRepoPath {

        @Test
        @DisplayName("should return correct repo path within workspace")
        void shouldReturnCorrectRepoPath() {
            UUID taskId = UUID.randomUUID();

            String path = workspaceService.getRepoPath(taskId, "backend-api");

            assertThat(path).contains(taskId.toString());
            assertThat(path).contains("backend-api");
        }
    }

    @Nested
    @DisplayName("workspaceExists")
    class WorkspaceExists {

        @Test
        @DisplayName("should return true when workspace exists")
        void shouldReturnTrueWhenExists() throws IOException {
            UUID taskId = UUID.randomUUID();
            workspaceService.createWorkspace(taskId);

            assertThat(workspaceService.workspaceExists(taskId)).isTrue();
        }

        @Test
        @DisplayName("should return false when workspace does not exist")
        void shouldReturnFalseWhenNotExists() {
            UUID taskId = UUID.randomUUID();

            assertThat(workspaceService.workspaceExists(taskId)).isFalse();
        }
    }

    @Nested
    @DisplayName("cleanupWorkspace")
    class CleanupWorkspace {

        @Test
        @DisplayName("should delete workspace directory and all contents")
        void shouldDeleteWorkspace() throws IOException {
            UUID taskId = UUID.randomUUID();
            String path = workspaceService.createWorkspace(taskId);

            // Add some files
            Files.writeString(Path.of(path, "file1.txt"), "content1");
            Files.createDirectories(Path.of(path, "subdir"));
            Files.writeString(Path.of(path, "subdir", "file2.txt"), "content2");

            workspaceService.cleanupWorkspace(taskId);

            assertThat(Files.exists(Path.of(path))).isFalse();
            assertThat(workspaceService.workspaceExists(taskId)).isFalse();
        }

        @Test
        @DisplayName("should handle non-existent workspace gracefully")
        void shouldHandleNonExistentWorkspace() {
            UUID taskId = UUID.randomUUID();

            // Should not throw
            assertThatCode(() -> workspaceService.cleanupWorkspace(taskId))
                    .doesNotThrowAnyException();
        }
    }

    @Nested
    @DisplayName("getWorkspaceSizeMb")
    class GetWorkspaceSizeMb {

        @Test
        @DisplayName("should return 0 for non-existent workspace")
        void shouldReturnZeroForNonExistent() throws IOException {
            UUID taskId = UUID.randomUUID();

            long size = workspaceService.getWorkspaceSizeMb(taskId);

            assertThat(size).isEqualTo(0);
        }

        @Test
        @DisplayName("should return size of workspace files")
        void shouldReturnWorkspaceSize() throws IOException {
            UUID taskId = UUID.randomUUID();
            String path = workspaceService.createWorkspace(taskId);

            // Create a file with known content
            Files.writeString(Path.of(path, "data.txt"), "Hello World");

            long size = workspaceService.getWorkspaceSizeMb(taskId);

            // Small file should be 0 MB (integer division)
            assertThat(size).isGreaterThanOrEqualTo(0);
        }
    }

    @Nested
    @DisplayName("isWithinSizeLimit")
    class IsWithinSizeLimit {

        @Test
        @DisplayName("should return true for workspace under limit")
        void shouldReturnTrueUnderLimit() throws IOException {
            UUID taskId = UUID.randomUUID();
            workspaceService.createWorkspace(taskId);

            assertThat(workspaceService.isWithinSizeLimit(taskId)).isTrue();
        }

        @Test
        @DisplayName("should return true for non-existent workspace (0 MB)")
        void shouldReturnTrueForNonExistent() throws IOException {
            UUID taskId = UUID.randomUUID();

            assertThat(workspaceService.isWithinSizeLimit(taskId)).isTrue();
        }
    }

    @Nested
    @DisplayName("cleanupOldWorkspaces")
    class CleanupOldWorkspaces {

        @Test
        @DisplayName("should return 0 when base directory does not exist")
        void shouldReturnZeroWhenNoBaseDir() {
            ReflectionTestUtils.setField(workspaceService, "basePath",
                    tempDir.resolve("nonexistent").toString());

            int cleaned = workspaceService.cleanupOldWorkspaces(24);

            assertThat(cleaned).isEqualTo(0);
        }

        @Test
        @DisplayName("should not clean recent workspaces")
        void shouldNotCleanRecentWorkspaces() throws IOException {
            UUID taskId = UUID.randomUUID();
            workspaceService.createWorkspace(taskId);

            // With a very high max age, nothing should be cleaned
            int cleaned = workspaceService.cleanupOldWorkspaces(9999);

            assertThat(cleaned).isEqualTo(0);
            assertThat(workspaceService.workspaceExists(taskId)).isTrue();
        }
    }

    @Nested
    @DisplayName("buildAuthenticatedUrl")
    class BuildAuthenticatedUrl {

        @Test
        @DisplayName("should embed credentials into HTTPS URL")
        void shouldEmbedCredentialsInHttpsUrl() {
            String url = "https://bitbucket.example.com/scm/proj/repo.git";

            String result = workspaceService.buildAuthenticatedUrl(url, "user", "token123");

            assertThat(result).isEqualTo("https://user:token123@bitbucket.example.com/scm/proj/repo.git");
        }

        @Test
        @DisplayName("should embed credentials into HTTP URL with port")
        void shouldEmbedCredentialsInHttpUrlWithPort() {
            String url = "http://bitbucket.local:7990/scm/proj/repo.git";

            String result = workspaceService.buildAuthenticatedUrl(url, "admin", "secret");

            assertThat(result).isEqualTo("http://admin:secret@bitbucket.local:7990/scm/proj/repo.git");
        }

        @Test
        @DisplayName("should return URL as-is when username is null")
        void shouldReturnAsIsWhenUsernameNull() {
            String url = "https://bitbucket.example.com/scm/proj/repo.git";

            String result = workspaceService.buildAuthenticatedUrl(url, null, "token");

            assertThat(result).isEqualTo(url);
        }

        @Test
        @DisplayName("should return URL as-is when token is blank")
        void shouldReturnAsIsWhenTokenBlank() {
            String url = "https://bitbucket.example.com/scm/proj/repo.git";

            String result = workspaceService.buildAuthenticatedUrl(url, "user", "");

            assertThat(result).isEqualTo(url);
        }

        @Test
        @DisplayName("should return URL as-is when both credentials are null")
        void shouldReturnAsIsWhenBothNull() {
            String url = "https://bitbucket.example.com/scm/proj/repo.git";

            String result = workspaceService.buildAuthenticatedUrl(url, null, null);

            assertThat(result).isEqualTo(url);
        }
    }

    @Nested
    @DisplayName("cloneRepository")
    class CloneRepository {

        @Test
        @DisplayName("should throw when workspace does not exist")
        void shouldThrowWhenWorkspaceDoesNotExist() {
            UUID taskId = UUID.randomUUID();

            assertThatThrownBy(() -> workspaceService.cloneRepository(
                    taskId, "https://example.com/repo.git", "user", "token", "main"))
                    .isInstanceOf(IOException.class)
                    .hasMessageContaining("Workspace does not exist");
        }
    }
}
