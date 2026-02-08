package com.promptdev.dto.bitbucket;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record CreatePullRequestRequest(
    @JsonProperty("title") String title,
    @JsonProperty("description") String description,
    @JsonProperty("fromRef") RefInfo fromRef,
    @JsonProperty("toRef") RefInfo toRef,
    @JsonProperty("reviewers") List<ReviewerInfo> reviewers
) {
    public record RefInfo(
        @JsonProperty("id") String id,
        @JsonProperty("repository") RepositoryInfo repository
    ) {
        public RefInfo(String id) {
            this(id, null);
        }
    }

    public record RepositoryInfo(
        @JsonProperty("slug") String slug,
        @JsonProperty("project") ProjectInfo project
    ) {}

    public record ProjectInfo(
        @JsonProperty("key") String key
    ) {}

    public record ReviewerInfo(
        @JsonProperty("user") UserInfo user
    ) {}

    public record UserInfo(
        @JsonProperty("name") String name
    ) {}
}
