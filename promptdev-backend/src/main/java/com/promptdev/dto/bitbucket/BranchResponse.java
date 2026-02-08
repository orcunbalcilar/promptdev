package com.promptdev.dto.bitbucket;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record BranchResponse(
    @JsonProperty("id") String id,
    @JsonProperty("displayId") String displayId,
    @JsonProperty("type") String type,
    @JsonProperty("latestCommit") String latestCommit,
    @JsonProperty("isDefault") boolean isDefault
) {}
