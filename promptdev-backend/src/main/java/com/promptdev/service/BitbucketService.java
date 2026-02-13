package com.promptdev.service;

import com.promptdev.config.BitbucketConfig;
import com.promptdev.dto.bitbucket.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Collections;
import java.util.List;

@Service
public class BitbucketService {

    private static final Logger log = LoggerFactory.getLogger(BitbucketService.class);

    private final RestClient bitbucketRestClient;
    private final RestClient bitbucketBranchUtilsClient;
    private final BitbucketConfig bitbucketConfig;

    public BitbucketService(
            RestClient bitbucketRestClient,
            RestClient bitbucketBranchUtilsClient,
            BitbucketConfig bitbucketConfig) {
        this.bitbucketRestClient = bitbucketRestClient;
        this.bitbucketBranchUtilsClient = bitbucketBranchUtilsClient;
        this.bitbucketConfig = bitbucketConfig;
    }

    /**
     * Get repository details
     */
    public RepositoryResponse getRepository(String projectKey, String repoSlug) {
        log.info("Fetching repository: {}/{}", projectKey, repoSlug);
        return bitbucketRestClient.get()
                .uri("/projects/{projectKey}/repos/{repoSlug}", projectKey, repoSlug)
                .retrieve()
                .body(RepositoryResponse.class);
    }

    /**
     * List repositories in a project
     */
    public List<RepositoryResponse> listRepositories(String projectKey) {
        log.info("Listing repositories in project: {}", projectKey);
        PagedResponse<RepositoryResponse> response = bitbucketRestClient.get()
                .uri("/projects/{projectKey}/repos?limit=100", projectKey)
                .retrieve()
                .body(new ParameterizedTypeReference<>() {});
        return response != null ? response.values() : Collections.emptyList();
    }

    /**
     * Get the default branch of a repository
     */
    public BranchResponse getDefaultBranch(String projectKey, String repoSlug) {
        log.info("Fetching default branch for {}/{}", projectKey, repoSlug);
        return bitbucketRestClient.get()
                .uri("/projects/{projectKey}/repos/{repoSlug}/default-branch", projectKey, repoSlug)
                .retrieve()
                .body(BranchResponse.class);
    }

    /**
     * Create a new branch in the repository
     */
    public BranchResponse createBranch(String projectKey, String repoSlug, 
                                       String branchName, String startPoint) {
        log.info("Creating branch '{}' from '{}' in {}/{}", branchName, startPoint, projectKey, repoSlug);
        
        CreateBranchRequest request = new CreateBranchRequest(branchName, startPoint);
        
        return bitbucketRestClient.post()
                .uri("/projects/{projectKey}/repos/{repoSlug}/branches", projectKey, repoSlug)
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(BranchResponse.class);
    }

    /**
     * Create a pull request
     */
    public PullRequestResponse createPullRequest(String projectKey, String repoSlug,
                                                  String title, String description,
                                                  String sourceBranch, String targetBranch,
                                                  List<String> reviewers) {
        log.info("Creating PR from '{}' to '{}' in {}/{}", sourceBranch, targetBranch, projectKey, repoSlug);

        List<CreatePullRequestRequest.ReviewerInfo> reviewerInfos = reviewers != null 
                ? reviewers.stream()
                    .map(r -> new CreatePullRequestRequest.ReviewerInfo(
                            new CreatePullRequestRequest.UserInfo(r)))
                    .toList()
                : Collections.emptyList();

        CreatePullRequestRequest request = new CreatePullRequestRequest(
                title,
                description,
                new CreatePullRequestRequest.RefInfo("refs/heads/" + sourceBranch),
                new CreatePullRequestRequest.RefInfo("refs/heads/" + targetBranch),
                reviewerInfos
        );

        return bitbucketRestClient.post()
                .uri("/projects/{projectKey}/repos/{repoSlug}/pull-requests", projectKey, repoSlug)
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(PullRequestResponse.class);
    }

    /**
     * Get a pull request by ID
     */
    public PullRequestResponse getPullRequest(String projectKey, String repoSlug, Long prId) {
        log.info("Fetching PR #{} from {}/{}", prId, projectKey, repoSlug);
        return bitbucketRestClient.get()
                .uri("/projects/{projectKey}/repos/{repoSlug}/pull-requests/{prId}", 
                        projectKey, repoSlug, prId)
                .retrieve()
                .body(PullRequestResponse.class);
    }

    /**
     * List branches in a repository
     */
    public List<BranchResponse> listBranches(String projectKey, String repoSlug, String filterText) {
        log.info("Listing branches in {}/{}", projectKey, repoSlug);
        boolean hasFilter = filterText != null && !filterText.isBlank();
        String uri = hasFilter
                ? "/projects/{projectKey}/repos/{repoSlug}/branches?filterText={filter}&limit=100"
                : "/projects/{projectKey}/repos/{repoSlug}/branches?limit=100";

        PagedResponse<BranchResponse> response = hasFilter
                ? bitbucketRestClient.get()
                        .uri(uri, projectKey, repoSlug, filterText)
                        .retrieve()
                        .body(new ParameterizedTypeReference<>() {})
                : bitbucketRestClient.get()
                        .uri(uri, projectKey, repoSlug)
                        .retrieve()
                        .body(new ParameterizedTypeReference<>() {});
        return response != null ? response.values() : Collections.emptyList();
    }

    /**
     * Delete a branch (for cleanup if needed)
     */
    public void deleteBranch(String projectKey, String repoSlug, String branchName) {
        log.info("Deleting branch '{}' in {}/{}", branchName, projectKey, repoSlug);
        
        // Branch delete uses branch-utils API
        bitbucketBranchUtilsClient.delete()
                .uri(uriBuilder -> uriBuilder
                        .path("/projects/{projectKey}/repos/{repoSlug}/branches")
                        .build(projectKey, repoSlug))
                .header("Content-Type", "application/json")
                .retrieve()
                .toBodilessEntity();
    }

    /**
     * Get clone URL for a repository
     */
    public String getCloneUrl(String projectKey, String repoSlug) {
        RepositoryResponse repo = getRepository(projectKey, repoSlug);
        String httpUrl = repo.getCloneUrl("http");
        if (httpUrl != null) {
            return httpUrl;
        }
        // Fallback: construct URL
        return bitbucketConfig.getBaseUrl() + "/scm/" + projectKey.toLowerCase() + "/" + repoSlug + ".git";
    }

    /**
     * Construct the web URL for a pull request
     */
    public String getPullRequestWebUrl(String projectKey, String repoSlug, Long prId) {
        return String.format("%s/projects/%s/repos/%s/pull-requests/%d",
                bitbucketConfig.getBaseUrl(), projectKey, repoSlug, prId);
    }
}
