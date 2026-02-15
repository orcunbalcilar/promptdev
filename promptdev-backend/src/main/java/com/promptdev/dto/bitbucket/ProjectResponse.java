package com.promptdev.dto.bitbucket;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import java.util.Map;

/**
 * DTO for Bitbucket Server project API responses.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record ProjectResponse(
    @JsonProperty("id") Long id,
    @JsonProperty("key") String key,
    @JsonProperty("name") String name,
    @JsonProperty("description") String description,
    @JsonProperty("public") boolean isPublic,
    @JsonProperty("type") String type,
    @JsonProperty("links") Map<String, List<LinkResponse>> links
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record LinkResponse(
        @JsonProperty("href") String href,
        @JsonProperty("name") String name
    ) {}
}
