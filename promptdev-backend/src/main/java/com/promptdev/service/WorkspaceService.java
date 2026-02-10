package com.promptdev.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.UUID;

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
