package com.promptdev.dto.jira;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record JiraIssueResponse(
    @JsonProperty("id") String id,
    @JsonProperty("key") String key,
    @JsonProperty("fields") JiraIssueFields fields
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record JiraIssueFields(
        @JsonProperty("summary") String summary,
        @JsonProperty("status") JiraStatus status,
        @JsonProperty("priority") JiraPriority priority,
        @JsonProperty("assignee") JiraUser assignee,
        @JsonProperty("reporter") JiraUser reporter,
        @JsonProperty("description") String description,
        @JsonProperty("created") String created,
        @JsonProperty("updated") String updated
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record JiraStatus(
        @JsonProperty("name") String name,
        @JsonProperty("id") String id
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record JiraPriority(
        @JsonProperty("name") String name,
        @JsonProperty("id") String id
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record JiraUser(
        @JsonProperty("name") String name,
        @JsonProperty("displayName") String displayName,
        @JsonProperty("emailAddress") String emailAddress
    ) {}
}
