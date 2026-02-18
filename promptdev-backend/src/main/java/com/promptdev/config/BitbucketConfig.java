package com.promptdev.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
@ConfigurationProperties(prefix = "bitbucket")
@Getter
@Setter
public class BitbucketConfig {

    private String baseUrl;
    private String username;
    private String token;

    @Bean
    public RestClient bitbucketRestClient() {
        RestClient.Builder builder = RestClient.builder()
                .baseUrl(baseUrl + "/rest/api/latest");

        configureAuth(builder);
        return builder.build();
    }

    @Bean
    public RestClient bitbucketBranchUtilsClient() {
        RestClient.Builder builder = RestClient.builder()
                .baseUrl(baseUrl + "/rest/branch-utils/latest");

        configureAuth(builder);
        return builder.build();
    }

    private void configureAuth(RestClient.Builder builder) {
        if (token != null && !token.isBlank()) {
            builder.defaultHeader("Authorization", "Bearer " + token);
        }
    }
}
