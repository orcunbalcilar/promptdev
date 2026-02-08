package com.promptdev.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.promptdev.dto.UpdateUserSettingsRequest;
import com.promptdev.dto.UserProfileDto;
import com.promptdev.entity.User;
import com.promptdev.service.UserService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(UserController.class)
@AutoConfigureMockMvc(addFilters = false)
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private UserService userService;

    private static final UUID USER_ID = UUID.randomUUID();

    private UserProfileDto sampleProfile() {
        return UserProfileDto.builder()
                .id(USER_ID.toString())
                .email("dev@example.com")
                .name("Test Developer")
                .avatarUrl("https://avatars.example.com/dev")
                .provider("github")
                .bitbucketUrl("https://bitbucket.company.com")
                .bitbucketProjectKey("PRJ")
                .bitbucketUsername("jdoe")
                .bitbucketTokenSet(true)
                .copilotTokenSet(false)
                .build();
    }

    @Nested
    @DisplayName("GET /users/{userId}/profile")
    class GetProfile {

        @Test
        @DisplayName("should return user profile")
        void shouldReturnProfile() throws Exception {
            when(userService.getUserProfile(USER_ID)).thenReturn(sampleProfile());

            mockMvc.perform(get("/users/{userId}/profile", USER_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(USER_ID.toString()))
                    .andExpect(jsonPath("$.email").value("dev@example.com"))
                    .andExpect(jsonPath("$.name").value("Test Developer"))
                    .andExpect(jsonPath("$.provider").value("github"))
                    .andExpect(jsonPath("$.bitbucketUrl").value("https://bitbucket.company.com"))
                    .andExpect(jsonPath("$.bitbucketProjectKey").value("PRJ"))
                    .andExpect(jsonPath("$.bitbucketUsername").value("jdoe"))
                    .andExpect(jsonPath("$.bitbucketTokenSet").value(true))
                    .andExpect(jsonPath("$.copilotTokenSet").value(false));
        }

        @Test
        @DisplayName("should return 500 when user not found")
        void shouldReturn500WhenNotFound() throws Exception {
            UUID unknownId = UUID.randomUUID();
            when(userService.getUserProfile(unknownId))
                    .thenThrow(new RuntimeException("User not found: " + unknownId));

            mockMvc.perform(get("/users/{userId}/profile", unknownId))
                    .andExpect(status().isInternalServerError());
        }
    }

    @Nested
    @DisplayName("PUT /users/{userId}/settings")
    class UpdateSettings {

        @Test
        @DisplayName("should update settings and return profile")
        void shouldUpdateSettings() throws Exception {
            UpdateUserSettingsRequest request = UpdateUserSettingsRequest.builder()
                    .bitbucketUrl("https://bitbucket.new.com")
                    .bitbucketProjectKey("NEWPRJ")
                    .bitbucketUsername("newuser")
                    .bitbucketToken("secret-token")
                    .build();

            UserProfileDto updatedProfile = UserProfileDto.builder()
                    .id(USER_ID.toString())
                    .email("dev@example.com")
                    .name("Test Developer")
                    .provider("github")
                    .bitbucketUrl("https://bitbucket.new.com")
                    .bitbucketProjectKey("NEWPRJ")
                    .bitbucketUsername("newuser")
                    .bitbucketTokenSet(true)
                    .copilotTokenSet(false)
                    .build();

            when(userService.updateSettings(eq(USER_ID), any(UpdateUserSettingsRequest.class)))
                    .thenReturn(updatedProfile);

            mockMvc.perform(put("/users/{userId}/settings", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.bitbucketUrl").value("https://bitbucket.new.com"))
                    .andExpect(jsonPath("$.bitbucketProjectKey").value("NEWPRJ"))
                    .andExpect(jsonPath("$.bitbucketTokenSet").value(true));

            verify(userService).updateSettings(eq(USER_ID), any(UpdateUserSettingsRequest.class));
        }

        @Test
        @DisplayName("should update copilot token")
        void shouldUpdateCopilotToken() throws Exception {
            UpdateUserSettingsRequest request = UpdateUserSettingsRequest.builder()
                    .copilotToken("gho_abc123")
                    .build();

            UserProfileDto profile = UserProfileDto.builder()
                    .id(USER_ID.toString())
                    .email("dev@example.com")
                    .name("Test Developer")
                    .provider("github")
                    .copilotTokenSet(true)
                    .build();

            when(userService.updateSettings(eq(USER_ID), any(UpdateUserSettingsRequest.class)))
                    .thenReturn(profile);

            mockMvc.perform(put("/users/{userId}/settings", USER_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.copilotTokenSet").value(true));
        }
    }

    @Nested
    @DisplayName("POST /users/sync")
    class SyncUser {

        @Test
        @DisplayName("should sync user and return profile")
        void shouldSyncUser() throws Exception {
            User user = User.builder()
                    .id(USER_ID)
                    .provider("github")
                    .providerAccountId("gh-12345")
                    .email("dev@example.com")
                    .name("Dev")
                    .build();

            when(userService.findOrCreateUser("github", "gh-12345", "dev@example.com", "Dev", null))
                    .thenReturn(user);
            when(userService.getUserProfile(USER_ID)).thenReturn(sampleProfile());

            mockMvc.perform(post("/users/sync")
                            .param("provider", "github")
                            .param("providerAccountId", "gh-12345")
                            .param("email", "dev@example.com")
                            .param("name", "Dev"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.email").value("dev@example.com"))
                    .andExpect(jsonPath("$.provider").value("github"));
        }

        @Test
        @DisplayName("should handle sync without optional params")
        void shouldHandleSyncWithoutOptionalParams() throws Exception {
            User user = User.builder()
                    .id(USER_ID)
                    .provider("google")
                    .providerAccountId("google-999")
                    .email("user@gmail.com")
                    .build();

            when(userService.findOrCreateUser("google", "google-999", "user@gmail.com", null, null))
                    .thenReturn(user);
            when(userService.getUserProfile(USER_ID)).thenReturn(
                    UserProfileDto.builder()
                            .id(USER_ID.toString())
                            .email("user@gmail.com")
                            .provider("google")
                            .build()
            );

            mockMvc.perform(post("/users/sync")
                            .param("provider", "google")
                            .param("providerAccountId", "google-999")
                            .param("email", "user@gmail.com"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.email").value("user@gmail.com"));
        }
    }
}
