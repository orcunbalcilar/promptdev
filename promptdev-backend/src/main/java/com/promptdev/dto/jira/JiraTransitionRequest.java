package com.promptdev.dto.jira;

import com.fasterxml.jackson.annotation.JsonProperty;

public record JiraTransitionRequest(
    @JsonProperty("transition") JiraTransitionInfo transition
) {
    public record JiraTransitionInfo(
        @JsonProperty("id") String id
    ) {}
}
