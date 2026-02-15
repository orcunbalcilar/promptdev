package com.promptdev.controller;

import com.promptdev.config.BitbucketConfig;
import com.promptdev.dto.bitbucket.BranchResponse;
import com.promptdev.dto.bitbucket.ProjectResponse;
import com.promptdev.dto.bitbucket.RepositoryResponse;
import com.promptdev.service.BitbucketService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for Bitbucket repository operations.
 * Exposes project, repository, and branch information to the frontend.
 */
@RestController
@RequiredArgsConstructor
@Slf4j
public class RepositoryController {

    private final BitbucketService bitbucketService;
    private final BitbucketConfig bitbucketConfig;

    /**
     * List all accessible Bitbucket projects.
     * Used by frontend to populate project dropdown.
     */
    @GetMapping("/projects")
    public ResponseEntity<List<ProjectResponse>> listProjects() {
        log.info("Listing all Bitbucket projects");
        List<ProjectResponse> projects = bitbucketService.listProjects();
        return ResponseEntity.ok(projects);
    }

    /**
     * List all repositories in a specific Bitbucket project.
     * Used by frontend to populate repository dropdown after selecting a project.
     *
     * @param projectKey The Bitbucket project key
     */
    @GetMapping("/projects/{projectKey}/repositories")
    public ResponseEntity<List<RepositoryResponse>> listRepositoriesByProject(
            @PathVariable String projectKey) {
        log.info("Listing repositories for project: {}", projectKey);
        List<RepositoryResponse> repos = bitbucketService.listRepositories(projectKey);
        return ResponseEntity.ok(repos);
    }

    /**
     * List all repositories across all projects, or for the configured default project.
     * Backwards-compatible endpoint. If a projectKey query param is provided, use it;
     * otherwise fall back to global config or list all.
     */
    @GetMapping("/repositories")
    public ResponseEntity<List<RepositoryResponse>> listRepositories(
            @RequestParam(required = false) String projectKey) {
        String effectiveProjectKey = resolveProjectKey(projectKey);
        if (effectiveProjectKey != null && !effectiveProjectKey.isBlank()) {
            log.info("Listing repositories for project: {}", effectiveProjectKey);
            List<RepositoryResponse> repos = bitbucketService.listRepositories(effectiveProjectKey);
            return ResponseEntity.ok(repos);
        }
        log.info("Listing repositories across all projects");
        List<RepositoryResponse> repos = bitbucketService.listAllRepositories();
        return ResponseEntity.ok(repos);
    }

    /**
     * Get details of a specific repository.
     */
    @GetMapping("/repositories/{repoSlug}")
    public ResponseEntity<RepositoryResponse> getRepository(
            @PathVariable String repoSlug,
            @RequestParam(required = false) String projectKey) {
        String effectiveProjectKey = resolveProjectKey(projectKey);
        log.info("Fetching repository: {}/{}", effectiveProjectKey, repoSlug);
        RepositoryResponse repo = bitbucketService.getRepository(effectiveProjectKey, repoSlug);
        return ResponseEntity.ok(repo);
    }

    /**
     * List branches for a repository.
     * Used by frontend to populate source/target branch dropdowns.
     *
     * @param repoSlug   Repository slug
     * @param projectKey Bitbucket project key
     * @param filter     Optional filter text for branch names
     */
    @GetMapping("/repositories/{repoSlug}/branches")
    public ResponseEntity<List<BranchResponse>> listBranches(
            @PathVariable String repoSlug,
            @RequestParam(required = false) String projectKey,
            @RequestParam(required = false) String filter) {
        String effectiveProjectKey = resolveProjectKey(projectKey);
        log.info("Listing branches for repository: {}/{}", effectiveProjectKey, repoSlug);
        List<BranchResponse> branches = bitbucketService.listBranches(effectiveProjectKey, repoSlug, filter);
        return ResponseEntity.ok(branches);
    }

    /**
     * Get the default branch of a repository.
     */
    @GetMapping("/repositories/{repoSlug}/default-branch")
    public ResponseEntity<BranchResponse> getDefaultBranch(
            @PathVariable String repoSlug,
            @RequestParam(required = false) String projectKey) {
        String effectiveProjectKey = resolveProjectKey(projectKey);
        log.info("Fetching default branch for repository: {}/{}", effectiveProjectKey, repoSlug);
        BranchResponse branch = bitbucketService.getDefaultBranch(effectiveProjectKey, repoSlug);
        return ResponseEntity.ok(branch);
    }

    /**
     * Get the clone URL for a repository.
     */
    @GetMapping("/repositories/{repoSlug}/clone-url")
    public ResponseEntity<CloneUrlResponse> getCloneUrl(
            @PathVariable String repoSlug,
            @RequestParam(required = false) String projectKey) {
        String effectiveProjectKey = resolveProjectKey(projectKey);
        log.info("Fetching clone URL for repository: {}/{}", effectiveProjectKey, repoSlug);
        String cloneUrl = bitbucketService.getCloneUrl(effectiveProjectKey, repoSlug);
        return ResponseEntity.ok(new CloneUrlResponse(cloneUrl));
    }

    /**
     * Resolve the effective project key: use explicit param if provided,
     * otherwise fall back to the global BitbucketConfig default.
     */
    private String resolveProjectKey(String projectKey) {
        if (projectKey != null && !projectKey.isBlank()) {
            return projectKey;
        }
        return bitbucketConfig.getProjectKey();
    }

    /**
     * Simple DTO for clone URL response.
     */
    public record CloneUrlResponse(String cloneUrl) {}
}
