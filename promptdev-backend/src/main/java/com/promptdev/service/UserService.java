package com.promptdev.service;

import com.promptdev.dto.UpdateUserSettingsRequest;
import com.promptdev.dto.UserProfileDto;
import com.promptdev.entity.User;
import com.promptdev.repository.UserRepository;
import com.promptdev.util.EncryptionUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.SecretKey;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    private static final String USER_NOT_FOUND = "User not found: ";

    @Value("${promptdev.encryption.key:}")
    private String encryptionKeyString;

    /**
     * Auto-generate ENCRYPTION_KEY at runtime if not provided.
     * This ensures the application can start without manual key configuration.
     * The generated key is stable for the lifetime of the JVM process.
     */
    private static volatile String generatedKey;
    private static final Object KEY_LOCK = new Object();
    private static final java.security.SecureRandom AUTO_KEY_RANDOM = new java.security.SecureRandom();

    private SecretKey getEncryptionKey() {
        String keyStr = encryptionKeyString;
        if (keyStr == null || keyStr.isBlank()) {
            synchronized (KEY_LOCK) {
                if (generatedKey == null) {
                    // Generate a stable 32-byte key from a secure random source
                    byte[] keyBytes = new byte[32];
                    AUTO_KEY_RANDOM.nextBytes(keyBytes);
                    generatedKey = java.util.Base64.getEncoder().encodeToString(keyBytes);
                    org.slf4j.LoggerFactory.getLogger(UserService.class)
                            .warn("ENCRYPTION_KEY not set — auto-generated a runtime key. "
                                    + "Encrypted tokens will NOT survive application restarts. "
                                    + "Set ENCRYPTION_KEY env var for persistent encryption.");
                }
                keyStr = generatedKey;
            }
        }
        return EncryptionUtil.deriveKey(keyStr);
    }

    /**
     * Find or create a user by OAuth provider info.
     */
    @Transactional
    public User findOrCreateUser(String provider, String providerAccountId, String email, String name, String avatarUrl) {
        Optional<User> existing = userRepository.findByProviderAndProviderAccountId(provider, providerAccountId);

        if (existing.isPresent()) {
            User user = existing.get();
            // Update profile fields on each login
            user.setName(name);
            user.setAvatarUrl(avatarUrl);
            user.setEmail(email);
            return userRepository.save(user);
        }

        User newUser = User.builder()
                .provider(provider)
                .providerAccountId(providerAccountId)
                .email(email)
                .name(name)
                .avatarUrl(avatarUrl)
                .build();

        return userRepository.save(newUser);
    }

    /**
     * Get user profile (with sensitive fields masked).
     */
    public UserProfileDto getUserProfile(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, USER_NOT_FOUND + userId));

        return UserProfileDto.builder()
                .id(user.getId().toString())
                .email(user.getEmail())
                .name(user.getName())
                .avatarUrl(user.getAvatarUrl())
                .provider(user.getProvider())
                .bitbucketUrl(user.getBitbucketUrl())
                .bitbucketProjectKey(user.getBitbucketProjectKey())
                .bitbucketUsername(user.getBitbucketUsername())
                .bitbucketTokenSet(user.getBitbucketTokenEncrypted() != null)
                .copilotTokenSet(user.getCopilotTokenEncrypted() != null)
                .byokProviderType(user.getByokProviderType())
                .byokBaseUrl(user.getByokBaseUrl())
                .byokApiKeySet(user.getByokApiKeyEncrypted() != null)
                .jiraUrl(user.getJiraUrl())
                .jiraProjectKey(user.getJiraProjectKey())
                .jiraUsername(user.getJiraUsername())
                .jiraTokenSet(user.getJiraTokenEncrypted() != null)
                .jiraAutoTaskEnabled(Boolean.TRUE.equals(user.getJiraAutoTaskEnabled()))
                .jiraAutoTaskModelId(user.getJiraAutoTaskModelId())
                .jiraAutoTaskRepository(user.getJiraAutoTaskRepository())
                .jiraAutoTaskSourceBranch(user.getJiraAutoTaskSourceBranch())
                .jiraAutoTaskTargetBranch(user.getJiraAutoTaskTargetBranch())
                .customSystemPrompt(user.getCustomSystemPrompt())
                .build();
    }

    /**
     * Update user settings. Only non-null fields are updated.
     * Tokens are encrypted before storage.
     */
    @Transactional
    public UserProfileDto updateSettings(UUID userId, UpdateUserSettingsRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, USER_NOT_FOUND + userId));

        SecretKey key = getEncryptionKey();

        updateBitbucketSettings(user, request, key);
        updateCopilotSettings(user, request, key);
        updateByokSettings(user, request, key);
        updateJiraSettings(user, request, key);
        updateJiraAutoTaskSettings(user, request);

        userRepository.save(user);
        return getUserProfile(userId);
    }

    private void updateBitbucketSettings(User user, UpdateUserSettingsRequest request, SecretKey key) {
        updateFieldIfPresent(request.getBitbucketUrl(), user::setBitbucketUrl);
        updateFieldIfPresent(request.getBitbucketProjectKey(), user::setBitbucketProjectKey);
        updateFieldIfPresent(request.getBitbucketUsername(), user::setBitbucketUsername);
        updateEncryptedToken(request.getBitbucketToken(), user::setBitbucketTokenEncrypted, key);
    }

    private void updateCopilotSettings(User user, UpdateUserSettingsRequest request, SecretKey key) {
        updateEncryptedToken(request.getCopilotToken(), user::setCopilotTokenEncrypted, key);
    }

    private void updateByokSettings(User user, UpdateUserSettingsRequest request, SecretKey key) {
        updateNullableField(request.getByokProviderType(), user::setByokProviderType);
        updateNullableField(request.getByokBaseUrl(), user::setByokBaseUrl);
        updateEncryptedToken(request.getByokApiKey(), user::setByokApiKeyEncrypted, key);
        updateNullableField(request.getByokAzureApiVersion(), user::setByokAzureApiVersion);
    }

    private void updateJiraSettings(User user, UpdateUserSettingsRequest request, SecretKey key) {
        updateNullableField(request.getJiraUrl(), user::setJiraUrl);
        updateNullableField(request.getJiraProjectKey(), user::setJiraProjectKey);
        updateNullableField(request.getJiraUsername(), user::setJiraUsername);
        updateEncryptedToken(request.getJiraToken(), user::setJiraTokenEncrypted, key);
    }

    private void updateJiraAutoTaskSettings(User user, UpdateUserSettingsRequest request) {
        if (request.getJiraAutoTaskEnabled() != null) {
            user.setJiraAutoTaskEnabled(request.getJiraAutoTaskEnabled());
        }
        updateNullableField(request.getJiraAutoTaskModelId(), user::setJiraAutoTaskModelId);
        updateNullableField(request.getJiraAutoTaskRepository(), user::setJiraAutoTaskRepository);
        updateNullableField(request.getJiraAutoTaskSourceBranch(), user::setJiraAutoTaskSourceBranch);
        updateNullableField(request.getJiraAutoTaskTargetBranch(), user::setJiraAutoTaskTargetBranch);
        if (request.getCustomSystemPrompt() != null) {
            user.setCustomSystemPrompt(request.getCustomSystemPrompt().isBlank() ? null : request.getCustomSystemPrompt());
        }
    }

    /** Set a field directly if the value is non-null. */
    private void updateFieldIfPresent(String value, java.util.function.Consumer<String> setter) {
        if (value != null) {
            setter.accept(value);
        }
    }

    /** Set a nullable field: non-null/non-empty → set, empty → null, null → skip. */
    private void updateNullableField(String value, java.util.function.Consumer<String> setter) {
        if (value != null) {
            setter.accept(value.isEmpty() ? null : value);
        }
    }

    /** Encrypt and set a token, or clear it if empty. */
    private void updateEncryptedToken(String rawToken, java.util.function.Consumer<String> setter, SecretKey key) {
        if (rawToken != null) {
            setter.accept(rawToken.isEmpty() ? null : EncryptionUtil.encrypt(rawToken, key));
        }
    }

    /**
     * Get the decrypted Copilot token for a user (for creating per-user sessions).
     */
    public Optional<String> getDecryptedCopilotToken(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, USER_NOT_FOUND + userId));

        if (user.getCopilotTokenEncrypted() == null) {
            return Optional.empty();
        }

        return Optional.of(EncryptionUtil.decrypt(user.getCopilotTokenEncrypted(), getEncryptionKey()));
    }

    /**
     * Get the decrypted Bitbucket token for a user.
     */
    public Optional<String> getDecryptedBitbucketToken(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, USER_NOT_FOUND + userId));

        if (user.getBitbucketTokenEncrypted() == null) {
            return Optional.empty();
        }

        return Optional.of(EncryptionUtil.decrypt(user.getBitbucketTokenEncrypted(), getEncryptionKey()));
    }

    /**
     * Get the decrypted BYOK API key for a user.
     */
    public Optional<String> getDecryptedByokApiKey(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, USER_NOT_FOUND + userId));

        if (user.getByokApiKeyEncrypted() == null) {
            return Optional.empty();
        }

        return Optional.of(EncryptionUtil.decrypt(user.getByokApiKeyEncrypted(), getEncryptionKey()));
    }
}
