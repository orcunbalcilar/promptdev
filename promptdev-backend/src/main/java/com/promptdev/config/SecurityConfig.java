package com.promptdev.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Security configuration for the application.
 * 
 * For production, integrate with your SSO/SAML provider.
 * This configuration provides a basic setup that can be extended.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) {
        http
            // Disable CSRF for API endpoints
            .csrf(AbstractHttpConfigurer::disable)
            
            // Configure session management
            .sessionManagement(session -> 
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            
            // Configure authorization
            .authorizeHttpRequests(auth -> auth
                // Public endpoints
                .requestMatchers("/health/**").permitAll()
                .requestMatchers("/actuator/health").permitAll()
                
                // Callback endpoint for Copilot agent (should be secured with API key in production)
                .requestMatchers("/stream/callback").permitAll()
                
                // SSE endpoints (authenticated)
                .requestMatchers("/stream/**").permitAll() // Change to authenticated() in production
                
                // All other endpoints require authentication
                .anyRequest().permitAll() // Change to authenticated() in production
            )
            
            // HTTP Basic authentication (for development)
            .httpBasic(Customizer.withDefaults())
            
            // Enable CORS
            .cors(Customizer.withDefaults());

        return http.build();
    }
}
