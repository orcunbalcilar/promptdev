package com.promptdev.dto.jira;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record JiraTransitionResponse(
    @JsonProperty("transitions") List<JiraTransition> transitions
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record JiraTransition(
        @JsonProperty("id") String id,
        @JsonProperty("name") String name,
        @JsonProperty("to") JiraStatus to
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record JiraStatus(
        @JsonProperty("name") String name,
        @JsonProperty("id") String id
    ) {}
}
