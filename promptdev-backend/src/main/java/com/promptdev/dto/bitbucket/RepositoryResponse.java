package com.promptdev.dto.bitbucket;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public record RepositoryResponse(
    @JsonProperty("id") Long id,
    @JsonProperty("slug") String slug,
    @JsonProperty("name") String name,
    @JsonProperty("description") String description,
    @JsonProperty("state") String state,
    @JsonProperty("forkable") boolean forkable,
    @JsonProperty("project") ProjectResponse project,
    @JsonProperty("links") Map<String, List<LinkResponse>> links
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ProjectResponse(
        @JsonProperty("key") String key,
        @JsonProperty("name") String name
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record LinkResponse(
        @JsonProperty("href") String href,
        @JsonProperty("name") String name
    ) {}

    public String getCloneUrl(String protocol) {
        if (links != null && links.containsKey("clone")) {
            return links.get("clone").stream()
                    .filter(l -> protocol.equalsIgnoreCase(l.name()))
                    .map(LinkResponse::href)
                    .findFirst()
                    .orElse(null);
        }
        return null;
    }
}
