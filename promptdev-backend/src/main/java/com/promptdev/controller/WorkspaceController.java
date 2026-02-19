package com.promptdev.controller;

import com.promptdev.config.BitbucketConfig;
import com.promptdev.entity.Task;
import com.promptdev.entity.WorkspaceType;
import com.promptdev.repository.TaskRepository;
import com.promptdev.service.BitbucketService;
import com.promptdev.service.WorkspaceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

/**
 * REST controller for ephemeral workspace management.
 * Provides endpoints for creating, querying, and cleaning up task workspaces.
 */
@RestController
@RequestMapping("/workspaces")
@RequiredArgsConstructor
@Slf4j
public class WorkspaceController {

    private final WorkspaceService workspaceService;
    private final BitbucketService bitbucketService;
    private final BitbucketConfig bitbucketConfig;
    private final TaskRepository taskRepository;

    /**
     * Create an ephemeral workspace for a task.
     * For LOCAL workspaces with an existing git repo, creates a git worktree.
     * For LOCAL workspaces with a custom path (new project), creates the directory at that path.
     * For other workspaces, creates a temporary directory in the default base path.
     */
    @PostMapping("/{taskId}")
    public ResponseEntity<Map<String, Object>> createWorkspace(@PathVariable UUID taskId) {
        try {
            // Fetch the task to check workspace type and custom path
            Task task = taskRepository.findById(taskId).orElse(null);
            String path;

            if (task != null && WorkspaceType.LOCAL == task.getWorkspaceType() && task.getWorkspacePath() != null && !task.getWorkspacePath().isBlank()) {
                String workspacePath = task.getWorkspacePath();
                boolean isExistingProject = workspacePath.equals(task.getRepositorySlug());

                if (isExistingProject && workspaceService.isGitRepository(workspacePath)) {
                    // Existing project: create a git worktree so the original repo is not modified
                    String branchName = task.getSourceBranch() != null ? task.getSourceBranch() : "promptdev/" + taskId;
                    path = workspaceService.createGitWorktree(workspacePath, taskId, branchName);
                    log.info("Created git worktree for LOCAL task {}: {}", taskId, path);
                } else {
                    // New project: create at the specified location
                    path = workspaceService.createLocalWorkspace(workspacePath);
                    log.info("Created LOCAL workspace at custom path for task {}: {}", taskId, path);
                }
            } else {
                // For other workspaces (including BITBUCKET), use the ephemeral path
                path = workspaceService.createWorkspace(taskId);
                log.info("Created ephemeral workspace for task {}: {}", taskId, path);
            }

            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                    "taskId", taskId.toString(),
                    "path", path,
                    "exists", true
            ));
        } catch (IOException e) {
            log.error("Failed to create workspace for task {}", taskId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", "Failed to create workspace",
                    "message", "Workspace creation failed. Contact administrator."
            ));
        }
    }

    /**
     * Get workspace info for a task.
     */
    @GetMapping("/{taskId}")
    public ResponseEntity<Map<String, Object>> getWorkspace(@PathVariable UUID taskId) {
        boolean exists = workspaceService.workspaceExists(taskId);
        if (!exists) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "taskId", taskId.toString(),
                    "exists", false
            ));
        }

        try {
            String path = workspaceService.getWorkspacePath(taskId);
            long sizeMb = workspaceService.getWorkspaceSizeMb(taskId);
            boolean withinLimit = workspaceService.isWithinSizeLimit(taskId);

            return ResponseEntity.ok(Map.of(
                    "taskId", taskId.toString(),
                    "path", path,
                    "exists", true,
                    "sizeMb", sizeMb,
                    "withinSizeLimit", withinLimit
            ));
        } catch (IOException e) {
            log.error("Failed to get workspace info for task {}", taskId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", "Failed to get workspace info",
                    "message", "Could not retrieve workspace details. Contact administrator."
            ));
        }
    }

    /**
     * Delete (cleanup) workspace for a task.
     */
    @DeleteMapping("/{taskId}")
    public ResponseEntity<Map<String, Object>> deleteWorkspace(@PathVariable UUID taskId) {
        workspaceService.cleanupWorkspace(taskId);
        return ResponseEntity.ok(Map.of(
                "taskId", taskId.toString(),
                "deleted", true
        ));
    }

    /**
     * Clone a Bitbucket repository into the task workspace.
     */
    @PostMapping("/{taskId}/clone")
    public ResponseEntity<Map<String, Object>> cloneRepository(
            @PathVariable UUID taskId,
            @RequestBody Map<String, String> request) {
        String projectKey = request.get("projectKey");
        String repoSlug = request.get("repoSlug");
        String sourceBranch = request.get("sourceBranch");

        if (projectKey == null || repoSlug == null || sourceBranch == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Missing required fields: projectKey, repoSlug, sourceBranch"
            ));
        }

        try {
            String cloneUrl = bitbucketService.getCloneUrl(projectKey, repoSlug);
            String path = workspaceService.cloneRepository(
                    taskId, cloneUrl,
                    bitbucketConfig.getUsername(), bitbucketConfig.getToken(),
                    sourceBranch);
            return ResponseEntity.ok(Map.of(
                    "taskId", taskId.toString(),
                    "path", path,
                    "cloned", true
            ));
        } catch (IOException e) {
            log.error("Failed to clone repository for task {}", taskId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", "Failed to clone repository",
                    "message", e.getMessage()
            ));
        }
    }
}
