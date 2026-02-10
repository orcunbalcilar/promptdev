package com.promptdev.dto.jira;

import com.fasterxml.jackson.annotation.JsonProperty;

public record JiraCommentRequest(
    @JsonProperty("body") String body
) {}
