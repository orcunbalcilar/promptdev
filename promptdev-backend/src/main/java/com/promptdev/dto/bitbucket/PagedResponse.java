package com.promptdev.dto.bitbucket;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record PagedResponse<T>(
    @JsonProperty("size") Integer size,
    @JsonProperty("limit") Integer limit,
    @JsonProperty("start") Integer start,
    @JsonProperty("isLastPage") boolean isLastPage,
    @JsonProperty("nextPageStart") Integer nextPageStart,
    @JsonProperty("values") List<T> values
) {}
