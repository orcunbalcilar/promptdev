package com.promptdev.controller;

import com.promptdev.dto.UpdateUserSettingsRequest;
import com.promptdev.dto.UserProfileDto;
import com.promptdev.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * REST controller for user profile and settings management.
 */
@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    /**
     * Get user profile by ID.
     */
    @GetMapping("/{userId}/profile")
    public ResponseEntity<UserProfileDto> getProfile(@PathVariable UUID userId) {
        return ResponseEntity.ok(userService.getUserProfile(userId));
    }

    /**
     * Update user settings (Bitbucket info, Copilot token, etc.).
     * Tokens are encrypted before storage — never stored in plaintext.
     */
    @PutMapping("/{userId}/settings")
    public ResponseEntity<UserProfileDto> updateSettings(
            @PathVariable UUID userId,
            @RequestBody UpdateUserSettingsRequest request) {
        return ResponseEntity.ok(userService.updateSettings(userId, request));
    }

    /**
     * Find or create a user by OAuth provider info.
     * Called by the frontend after NextAuth.js sign-in.
     */
    @PostMapping("/sync")
    public ResponseEntity<UserProfileDto> syncUser(
            @RequestParam String provider,
            @RequestParam String providerAccountId,
            @RequestParam String email,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String avatarUrl) {
        var user = userService.findOrCreateUser(provider, providerAccountId, email, name, avatarUrl);
        return ResponseEntity.ok(userService.getUserProfile(user.getId()));
    }
}
