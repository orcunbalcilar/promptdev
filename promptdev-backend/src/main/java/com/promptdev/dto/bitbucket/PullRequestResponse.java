package com.promptdev.dto.bitbucket;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record PullRequestResponse(
    @JsonProperty("id") Long id,
    @JsonProperty("version") Integer version,
    @JsonProperty("title") String title,
    @JsonProperty("description") String description,
    @JsonProperty("state") String state,
    @JsonProperty("open") boolean open,
    @JsonProperty("closed") boolean closed,
    @JsonProperty("createdDate") Long createdDate,
    @JsonProperty("updatedDate") Long updatedDate,
    @JsonProperty("fromRef") RefResponse fromRef,
    @JsonProperty("toRef") RefResponse toRef,
    @JsonProperty("links") LinksResponse links
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record RefResponse(
        @JsonProperty("id") String id,
        @JsonProperty("displayId") String displayId,
        @JsonProperty("latestCommit") String latestCommit
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record LinksResponse(
        @JsonProperty("self") java.util.List<LinkResponse> self
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record LinkResponse(
        @JsonProperty("href") String href
    ) {}

    public String getPrUrl() {
        if (links != null && links.self() != null && !links.self().isEmpty()) {
            return links.self().get(0).href();
        }
        return null;
    }
}
