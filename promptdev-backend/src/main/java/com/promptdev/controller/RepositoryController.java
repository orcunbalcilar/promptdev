package com.promptdev.controller;

import com.promptdev.config.BitbucketConfig;
import com.promptdev.dto.bitbucket.BranchResponse;
import com.promptdev.dto.bitbucket.RepositoryResponse;
import com.promptdev.service.BitbucketService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for Bitbucket repository operations.
 * Exposes repository and branch information to the frontend.
 */
@RestController
@RequestMapping("/repositories")
@RequiredArgsConstructor
@Slf4j
public class RepositoryController {

    private final BitbucketService bitbucketService;
    private final BitbucketConfig bitbucketConfig;

    /**
     * List all repositories in the configured Bitbucket project.
     * Used by frontend to populate repository dropdown.
     */
    @GetMapping
    public ResponseEntity<List<RepositoryResponse>> listRepositories() {
        log.info("Listing repositories for project: {}", getProjectKey());
        List<RepositoryResponse> repos = bitbucketService.listRepositories(getProjectKey());
        return ResponseEntity.ok(repos);
    }

    /**
     * Get details of a specific repository.
     */
    @GetMapping("/{repoSlug}")
    public ResponseEntity<RepositoryResponse> getRepository(@PathVariable String repoSlug) {
        log.info("Fetching repository: {}", repoSlug);
        RepositoryResponse repo = bitbucketService.getRepository(getProjectKey(), repoSlug);
        return ResponseEntity.ok(repo);
    }

    /**
     * List branches for a repository.
     * Used by frontend to populate source/target branch dropdowns.
     * 
     * @param repoSlug Repository slug
     * @param filter Optional filter text for branch names
     */
    @GetMapping("/{repoSlug}/branches")
    public ResponseEntity<List<BranchResponse>> listBranches(
            @PathVariable String repoSlug,
            @RequestParam(required = false) String filter) {
        log.info("Listing branches for repository: {}", repoSlug);
        List<BranchResponse> branches = bitbucketService.listBranches(getProjectKey(), repoSlug, filter);
        return ResponseEntity.ok(branches);
    }

    /**
     * Get the default branch of a repository.
     */
    @GetMapping("/{repoSlug}/default-branch")
    public ResponseEntity<BranchResponse> getDefaultBranch(@PathVariable String repoSlug) {
        log.info("Fetching default branch for repository: {}", repoSlug);
        BranchResponse branch = bitbucketService.getDefaultBranch(getProjectKey(), repoSlug);
        return ResponseEntity.ok(branch);
    }

    /**
     * Get the clone URL for a repository.
     */
    @GetMapping("/{repoSlug}/clone-url")
    public ResponseEntity<CloneUrlResponse> getCloneUrl(@PathVariable String repoSlug) {
        log.info("Fetching clone URL for repository: {}", repoSlug);
        String cloneUrl = bitbucketService.getCloneUrl(getProjectKey(), repoSlug);
        return ResponseEntity.ok(new CloneUrlResponse(cloneUrl));
    }

    /**
     * Get the configured project key from BitbucketConfig.
     */
    private String getProjectKey() {
        return bitbucketConfig.getProjectKey();
    }

    /**
     * Simple DTO for clone URL response.
     */
    public record CloneUrlResponse(String cloneUrl) {}
}
