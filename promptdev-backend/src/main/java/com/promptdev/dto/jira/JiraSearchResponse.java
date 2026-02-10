package com.promptdev.dto.jira;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record JiraSearchResponse(
    @JsonProperty("startAt") int startAt,
    @JsonProperty("maxResults") int maxResults,
    @JsonProperty("total") int total,
    @JsonProperty("issues") List<JiraIssueResponse> issues
) {}
