package com.promptdev.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

/**
 * Configuration for Jira Server integration.
 * Only creates the RestClient bean when jira.base-url is set.
 */
@Configuration
@ConfigurationProperties(prefix = "jira")
@Getter
@Setter
public class JiraConfig {

    private String baseUrl;
    private String username;
    private String password;
    private String token;

    @Bean
    @ConditionalOnProperty(prefix = "jira", name = "base-url")
    public RestClient jiraRestClient() {
        RestClient.Builder builder = RestClient.builder()
                .baseUrl(baseUrl + "/rest/api/2");

        configureAuth(builder);
        return builder.build();
    }

    private void configureAuth(RestClient.Builder builder) {
        if (token != null && !token.isBlank()) {
            builder.defaultHeaders(headers ->
                headers.setBasicAuth(username, token));
        } else if (username != null && password != null) {
            builder.defaultHeaders(headers ->
                headers.setBasicAuth(username, password));
        }
    }
}
