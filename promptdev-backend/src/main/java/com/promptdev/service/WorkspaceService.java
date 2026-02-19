package com.promptdev.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * Service for managing ephemeral workspaces.
 * 
 * Handles creating temporary directories for cloned repositories,
 * and cleaning them up after task completion to prevent memory leaks.
 */
@Service
@Slf4j
public class WorkspaceService {

    @Value("${promptdev.workspace.base-path:#{systemProperties['java.io.tmpdir']}/promptdev-workspaces}")
    private String basePath;

    @Value("${promptdev.workspace.max-size-mb:500}")
    private int maxSizeMb;

    @Value("${promptdev.workspace.clone-timeout-seconds:300}")
    private int cloneTimeoutSeconds;

    /**
     * Create an ephemeral workspace directory for a task.
     *
     * @param taskId the task ID
     * @return the absolute path to the workspace directory
     */
    public String createWorkspace(UUID taskId) throws IOException {
        Path workspaceDir = Path.of(basePath, taskId.toString());
        
        if (Files.exists(workspaceDir)) {
            log.warn("Workspace already exists for task {}, cleaning up first", taskId);
            cleanupWorkspace(taskId);
        }

        Files.createDirectories(workspaceDir);
        log.info("Created ephemeral workspace for task {}: {}", taskId, workspaceDir);
        return workspaceDir.toAbsolutePath().toString();
    }

    /**
     * Create a workspace directory for a specific repository within a task workspace.
     *
     * @param taskId the task ID
     * @param repoSlug the repository slug
     * @return the absolute path to the repository directory within the workspace
     */
    public String createRepoDirectory(UUID taskId, String repoSlug) throws IOException {
        Path repoDir = Path.of(basePath, taskId.toString(), repoSlug);
        Files.createDirectories(repoDir);
        log.info("Created repo directory for task {}/{}: {}", taskId, repoSlug, repoDir);
        return repoDir.toAbsolutePath().toString();
    }

    /**
     * Clone a git repository into the workspace directory.
     *
     * @param taskId       the task ID (workspace must already exist)
     * @param cloneUrl     the HTTP clone URL of the repository
     * @param username     Bitbucket username for authentication
     * @param token        Bitbucket token/password for authentication
     * @param sourceBranch the branch to check out after cloning
     * @return the absolute path to the cloned repository
     */
    public String cloneRepository(UUID taskId, String cloneUrl, String username,
                                   String token, String sourceBranch) throws IOException {
        Path workspaceDir = Path.of(basePath, taskId.toString());
        if (!Files.exists(workspaceDir)) {
            throw new IOException("Workspace does not exist for task " + taskId);
        }

        // Build authenticated clone URL
        String authCloneUrl = buildAuthenticatedUrl(cloneUrl, username, token);

        try {
            // Clone into the workspace directory
            log.info("Cloning repository into workspace for task {}", taskId);
            runGitCommand(workspaceDir, "git", "clone", "--branch", sourceBranch,
                    authCloneUrl, ".");
            log.info("Repository cloned successfully for task {}", taskId);
        } catch (IOException e) {
            // If cloning with branch fails (branch might not exist on remote yet),
            // try cloning without branch and then create/checkout the branch
            log.warn("Clone with branch '{}' failed, trying default clone: {}", sourceBranch, e.getMessage());
            
            // Clean the workspace directory first (git clone may have left partial data)
            cleanDirectoryContents(workspaceDir);
            
            runGitCommand(workspaceDir, "git", "clone", authCloneUrl, ".");
            runGitCommand(workspaceDir, "git", "checkout", "-B", sourceBranch);
            log.info("Repository cloned and branch '{}' created for task {}", sourceBranch, taskId);
        }

        return workspaceDir.toAbsolutePath().toString();
    }

    /**
     * Build an authenticated URL by embedding credentials.
     * Supports http:// and https:// URLs.
     */
    String buildAuthenticatedUrl(String cloneUrl, String username, String token) {
        if (username == null || username.isBlank() || token == null || token.isBlank()) {
            return cloneUrl;
        }
        try {
            URI uri = URI.create(cloneUrl);
            String scheme = uri.getScheme();
            String host = uri.getHost();
            int port = uri.getPort();
            String path = uri.getPath();
            String hostPort = port > 0 ? host + ":" + port : host;
            return scheme + "://" + username + ":" + token + "@" + hostPort + path;
        } catch (Exception e) {
            log.warn("Failed to parse clone URL, using as-is: {}", e.getMessage());
            return cloneUrl;
        }
    }

    private void runGitCommand(Path workDir, String... command) throws IOException {
        try {
            ProcessBuilder pb = new ProcessBuilder(command)
                    .directory(workDir.toFile())
                    .redirectErrorStream(true);
            // Prevent git from prompting for credentials interactively
            pb.environment().put("GIT_TERMINAL_PROMPT", "0");
            Process process = pb.start();
            String output = new String(process.getInputStream().readAllBytes());
            boolean finished = process.waitFor(cloneTimeoutSeconds, TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                throw new IOException("Git command timed out after " + cloneTimeoutSeconds + "s");
            }
            if (process.exitValue() != 0) {
                // Sanitize output to avoid leaking credentials
                String sanitized = output.replaceAll("://[^@]+@", "://***@");
                throw new IOException("Git command failed (exit " + process.exitValue() + "): " + sanitized);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("Git command interrupted", e);
        }
    }

    private void cleanDirectoryContents(Path dir) throws IOException {
        if (!Files.exists(dir)) return;
        try (DirectoryStream<Path> stream = Files.newDirectoryStream(dir)) {
            for (Path entry : stream) {
                if (Files.isDirectory(entry)) {
                    Files.walkFileTree(entry, new SimpleFileVisitor<>() {
                        @Override
                        public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                            Files.delete(file);
                            return FileVisitResult.CONTINUE;
                        }
                        @Override
                        public FileVisitResult postVisitDirectory(Path d, IOException exc) throws IOException {
                            Files.delete(d);
                            return FileVisitResult.CONTINUE;
                        }
                    });
                } else {
                    Files.delete(entry);
                }
            }
        }
    }

    /**
     * Get the workspace path for a task.
     */
    public String getWorkspacePath(UUID taskId) {
        return Path.of(basePath, taskId.toString()).toAbsolutePath().toString();
    }

    /**
     * Get the repository path within a task workspace.
     */
    public String getRepoPath(UUID taskId, String repoSlug) {
        return Path.of(basePath, taskId.toString(), repoSlug).toAbsolutePath().toString();
    }

    /**
     * Check if workspace exists.
     */
    public boolean workspaceExists(UUID taskId) {
        return Files.exists(Path.of(basePath, taskId.toString()));
    }

    /**
     * Calculate workspace size in MB.
     */
    public long getWorkspaceSizeMb(UUID taskId) throws IOException {
        Path workspaceDir = Path.of(basePath, taskId.toString());
        if (!Files.exists(workspaceDir)) {
            return 0;
        }

        final long[] size = {0};
        Files.walkFileTree(workspaceDir, new SimpleFileVisitor<>() {
            @Override
            public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) {
                size[0] += attrs.size();
                return FileVisitResult.CONTINUE;
            }
        });

        return size[0] / (1024 * 1024);
    }

    /**
     * Validate workspace is under max size limit.
     */
    public boolean isWithinSizeLimit(UUID taskId) throws IOException {
        return getWorkspaceSizeMb(taskId) <= maxSizeMb;
    }

    /**
     * Cleanup the ephemeral workspace for a task.
     * Recursively deletes the workspace directory and all its contents.
     *
     * @param taskId the task ID
     */
    public void cleanupWorkspace(UUID taskId) {
        Path workspaceDir = Path.of(basePath, taskId.toString());
        
        if (!Files.exists(workspaceDir)) {
            log.debug("No workspace to clean up for task {}", taskId);
            return;
        }

        try {
            Files.walkFileTree(workspaceDir, new SimpleFileVisitor<>() {
                @Override
                public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                    Files.delete(file);
                    return FileVisitResult.CONTINUE;
                }

                @Override
                public FileVisitResult postVisitDirectory(Path dir, IOException exc) throws IOException {
                    Files.delete(dir);
                    return FileVisitResult.CONTINUE;
                }
            });
            log.info("Cleaned up ephemeral workspace for task {}: {}", taskId, workspaceDir);
        } catch (IOException e) {
            log.error("Failed to cleanup workspace for task {}: {}", taskId, e.getMessage());
        }
    }

    /**
     * Cleanup all workspaces older than the specified hours.
     * Used for periodic cleanup to prevent memory leaks from abandoned workspaces.
     */
    public int cleanupOldWorkspaces(int maxAgeHours) {
        Path baseDir = Path.of(basePath);
        
        if (!Files.exists(baseDir)) {
            return 0;
        }

        int cleaned = 0;
        try (DirectoryStream<Path> stream = Files.newDirectoryStream(baseDir)) {
            for (Path dir : stream) {
                try {
                    BasicFileAttributes attrs = Files.readAttributes(dir, BasicFileAttributes.class);
                    long ageHours = java.time.Duration.between(
                            attrs.lastModifiedTime().toInstant(), 
                            java.time.Instant.now()
                    ).toHours();

                    if (ageHours > maxAgeHours) {
                        String dirName = dir.getFileName().toString();
                        try {
                            UUID taskId = UUID.fromString(dirName);
                            cleanupWorkspace(taskId);
                            cleaned++;
                        } catch (IllegalArgumentException e) {
                            log.warn("Skipping non-task workspace directory: {}", dirName);
                        }
                    }
                } catch (IOException e) {
                    log.warn("Error checking workspace age: {}", e.getMessage());
                }
            }
        } catch (IOException e) {
            log.error("Error listing workspace directories: {}", e.getMessage());
        }

        if (cleaned > 0) {
            log.info("Cleaned up {} old workspaces (older than {} hours)", cleaned, maxAgeHours);
        }
        return cleaned;
    }
}
