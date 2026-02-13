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

    @Value("${promptdev.encryption.key}")
    private String encryptionKeyString;

    private SecretKey getEncryptionKey() {
        return EncryptionUtil.deriveKey(encryptionKeyString);
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

        if (request.getBitbucketUrl() != null) {
            user.setBitbucketUrl(request.getBitbucketUrl());
        }
        if (request.getBitbucketProjectKey() != null) {
            user.setBitbucketProjectKey(request.getBitbucketProjectKey());
        }
        if (request.getBitbucketUsername() != null) {
            user.setBitbucketUsername(request.getBitbucketUsername());
        }
        if (request.getBitbucketToken() != null) {
            if (request.getBitbucketToken().isEmpty()) {
                user.setBitbucketTokenEncrypted(null);
            } else {
                user.setBitbucketTokenEncrypted(
                        EncryptionUtil.encrypt(request.getBitbucketToken(), key));
            }
        }
        if (request.getCopilotToken() != null) {
            if (request.getCopilotToken().isEmpty()) {
                user.setCopilotTokenEncrypted(null);
            } else {
                user.setCopilotTokenEncrypted(
                        EncryptionUtil.encrypt(request.getCopilotToken(), key));
            }
        }

        // BYOK Provider settings
        if (request.getByokProviderType() != null) {
            user.setByokProviderType(request.getByokProviderType().isEmpty() ? null : request.getByokProviderType());
        }
        if (request.getByokBaseUrl() != null) {
            user.setByokBaseUrl(request.getByokBaseUrl().isEmpty() ? null : request.getByokBaseUrl());
        }
        if (request.getByokApiKey() != null) {
            if (request.getByokApiKey().isEmpty()) {
                user.setByokApiKeyEncrypted(null);
            } else {
                user.setByokApiKeyEncrypted(
                        EncryptionUtil.encrypt(request.getByokApiKey(), key));
            }
        }
        if (request.getByokAzureApiVersion() != null) {
            user.setByokAzureApiVersion(request.getByokAzureApiVersion().isEmpty() ? null : request.getByokAzureApiVersion());
        }

        // Jira settings
        if (request.getJiraUrl() != null) {
            user.setJiraUrl(request.getJiraUrl().isEmpty() ? null : request.getJiraUrl());
        }
        if (request.getJiraProjectKey() != null) {
            user.setJiraProjectKey(request.getJiraProjectKey().isEmpty() ? null : request.getJiraProjectKey());
        }
        if (request.getJiraUsername() != null) {
            user.setJiraUsername(request.getJiraUsername().isEmpty() ? null : request.getJiraUsername());
        }
        if (request.getJiraToken() != null) {
            if (request.getJiraToken().isEmpty()) {
                user.setJiraTokenEncrypted(null);
            } else {
                user.setJiraTokenEncrypted(
                        EncryptionUtil.encrypt(request.getJiraToken(), key));
            }
        }

        userRepository.save(user);
        return getUserProfile(userId);
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
