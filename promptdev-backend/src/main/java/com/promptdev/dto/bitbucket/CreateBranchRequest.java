package com.promptdev.dto.bitbucket;

import com.fasterxml.jackson.annotation.JsonProperty;

public record CreateBranchRequest(
    @JsonProperty("name") String name,
    @JsonProperty("startPoint") String startPoint,
    @JsonProperty("message") String message
) {
    public CreateBranchRequest(String name, String startPoint) {
        this(name, startPoint, null);
    }
}
