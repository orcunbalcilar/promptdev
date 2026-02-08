package com.promptdev.service;

import com.promptdev.dto.UpdateUserSettingsRequest;
import com.promptdev.dto.UserProfileDto;
import com.promptdev.entity.User;
import com.promptdev.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService userService;

    private static final String ENCRYPTION_KEY = "TestEncryptionKey1234567890123456";

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(userService, "encryptionKeyString", ENCRYPTION_KEY);
    }

    private User createSampleUser() {
        return User.builder()
                .id(UUID.randomUUID())
                .provider("github")
                .providerAccountId("gh-12345")
                .email("dev@example.com")
                .name("Test Developer")
                .avatarUrl("https://avatars.example.com/dev")
                .build();
    }

    @Nested
    @DisplayName("findOrCreateUser")
    class FindOrCreateUser {

        @Test
        @DisplayName("should create a new user when no existing user found")
        void shouldCreateNewUser() {
            when(userRepository.findByProviderAndProviderAccountId("github", "gh-12345"))
                    .thenReturn(Optional.empty());
            when(userRepository.save(any(User.class)))
                    .thenAnswer(inv -> {
                        User u = inv.getArgument(0);
                        u.setId(UUID.randomUUID());
                        return u;
                    });

            User result = userService.findOrCreateUser("github", "gh-12345", "dev@example.com", "Dev", "https://avatar.url");

            assertThat(result.getProvider()).isEqualTo("github");
            assertThat(result.getProviderAccountId()).isEqualTo("gh-12345");
            assertThat(result.getEmail()).isEqualTo("dev@example.com");
            assertThat(result.getName()).isEqualTo("Dev");
            assertThat(result.getAvatarUrl()).isEqualTo("https://avatar.url");

            verify(userRepository).save(any(User.class));
        }

        @Test
        @DisplayName("should return existing user and update profile fields")
        void shouldReturnExistingAndUpdate() {
            User existing = createSampleUser();
            when(userRepository.findByProviderAndProviderAccountId("github", "gh-12345"))
                    .thenReturn(Optional.of(existing));
            when(userRepository.save(any(User.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            User result = userService.findOrCreateUser("github", "gh-12345", "new@example.com", "New Name", "https://new-avatar.url");

            assertThat(result.getEmail()).isEqualTo("new@example.com");
            assertThat(result.getName()).isEqualTo("New Name");
            assertThat(result.getAvatarUrl()).isEqualTo("https://new-avatar.url");
        }
    }

    @Nested
    @DisplayName("getUserProfile")
    class GetUserProfile {

        @Test
        @DisplayName("should return profile DTO without sensitive data")
        void shouldReturnProfileDto() {
            User user = createSampleUser();
            user.setBitbucketUrl("https://bitbucket.company.com");
            user.setBitbucketProjectKey("PRJ");
            user.setBitbucketUsername("jdoe");
            user.setBitbucketTokenEncrypted("encrypted-token");
            user.setCopilotTokenEncrypted("encrypted-copilot");

            when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

            UserProfileDto profile = userService.getUserProfile(user.getId());

            assertThat(profile.getId()).isEqualTo(user.getId().toString());
            assertThat(profile.getEmail()).isEqualTo("dev@example.com");
            assertThat(profile.getName()).isEqualTo("Test Developer");
            assertThat(profile.getProvider()).isEqualTo("github");
            assertThat(profile.getBitbucketUrl()).isEqualTo("https://bitbucket.company.com");
            assertThat(profile.getBitbucketProjectKey()).isEqualTo("PRJ");
            assertThat(profile.getBitbucketUsername()).isEqualTo("jdoe");
            assertThat(profile.isBitbucketTokenSet()).isTrue();
            assertThat(profile.isCopilotTokenSet()).isTrue();
        }

        @Test
        @DisplayName("should indicate tokens are not set when null")
        void shouldIndicateTokensNotSet() {
            User user = createSampleUser();
            when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

            UserProfileDto profile = userService.getUserProfile(user.getId());

            assertThat(profile.isBitbucketTokenSet()).isFalse();
            assertThat(profile.isCopilotTokenSet()).isFalse();
        }

        @Test
        @DisplayName("should throw when user not found")
        void shouldThrowWhenNotFound() {
            UUID unknownId = UUID.randomUUID();
            when(userRepository.findById(unknownId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> userService.getUserProfile(unknownId))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("User not found");
        }
    }

    @Nested
    @DisplayName("updateSettings")
    class UpdateSettings {

        @Test
        @DisplayName("should update Bitbucket settings")
        void shouldUpdateBitbucketSettings() {
            User user = createSampleUser();
            when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
            when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

            UpdateUserSettingsRequest request = UpdateUserSettingsRequest.builder()
                    .bitbucketUrl("https://bitbucket.new.com")
                    .bitbucketProjectKey("NEWPRJ")
                    .bitbucketUsername("newuser")
                    .build();

            UserProfileDto result = userService.updateSettings(user.getId(), request);

            assertThat(result.getBitbucketUrl()).isEqualTo("https://bitbucket.new.com");
            assertThat(result.getBitbucketProjectKey()).isEqualTo("NEWPRJ");
            assertThat(result.getBitbucketUsername()).isEqualTo("newuser");
        }

        @Test
        @DisplayName("should encrypt Bitbucket token before storage")
        void shouldEncryptBitbucketToken() {
            User user = createSampleUser();
            when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
            when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

            UpdateUserSettingsRequest request = UpdateUserSettingsRequest.builder()
                    .bitbucketToken("my-secret-token")
                    .build();

            userService.updateSettings(user.getId(), request);

            ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
            verify(userRepository).save(captor.capture());

            User saved = captor.getValue();
            assertThat(saved.getBitbucketTokenEncrypted()).isNotNull();
            assertThat(saved.getBitbucketTokenEncrypted()).isNotEqualTo("my-secret-token");
        }

        @Test
        @DisplayName("should encrypt Copilot token before storage")
        void shouldEncryptCopilotToken() {
            User user = createSampleUser();
            when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
            when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

            UpdateUserSettingsRequest request = UpdateUserSettingsRequest.builder()
                    .copilotToken("gho_abc123tokensecret")
                    .build();

            userService.updateSettings(user.getId(), request);

            ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
            verify(userRepository).save(captor.capture());

            User saved = captor.getValue();
            assertThat(saved.getCopilotTokenEncrypted()).isNotNull();
            assertThat(saved.getCopilotTokenEncrypted()).isNotEqualTo("gho_abc123tokensecret");
        }

        @Test
        @DisplayName("should clear token when empty string is provided")
        void shouldClearTokenOnEmptyString() {
            User user = createSampleUser();
            user.setBitbucketTokenEncrypted("old-encrypted");
            user.setCopilotTokenEncrypted("old-copilot-encrypted");

            when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
            when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

            UpdateUserSettingsRequest request = UpdateUserSettingsRequest.builder()
                    .bitbucketToken("")
                    .copilotToken("")
                    .build();

            userService.updateSettings(user.getId(), request);

            ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
            verify(userRepository).save(captor.capture());

            User saved = captor.getValue();
            assertThat(saved.getBitbucketTokenEncrypted()).isNull();
            assertThat(saved.getCopilotTokenEncrypted()).isNull();
        }

        @Test
        @DisplayName("should not update null fields")
        void shouldNotUpdateNullFields() {
            User user = createSampleUser();
            user.setBitbucketUrl("https://old-bitbucket.com");
            user.setBitbucketProjectKey("OLDPRJ");

            when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
            when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

            // Only update username, leave other fields as null
            UpdateUserSettingsRequest request = UpdateUserSettingsRequest.builder()
                    .bitbucketUsername("newuser")
                    .build();

            userService.updateSettings(user.getId(), request);

            ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
            verify(userRepository).save(captor.capture());

            User saved = captor.getValue();
            assertThat(saved.getBitbucketUrl()).isEqualTo("https://old-bitbucket.com");
            assertThat(saved.getBitbucketProjectKey()).isEqualTo("OLDPRJ");
            assertThat(saved.getBitbucketUsername()).isEqualTo("newuser");
        }
    }

    @Nested
    @DisplayName("getDecryptedCopilotToken")
    class GetDecryptedCopilotToken {

        @Test
        @DisplayName("should return empty when no token is set")
        void shouldReturnEmptyWhenNoToken() {
            User user = createSampleUser();
            when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

            Optional<String> result = userService.getDecryptedCopilotToken(user.getId());

            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("should decrypt and return token when set")
        void shouldDecryptAndReturnToken() {
            User user = createSampleUser();
            // First encrypt a token via updateSettings
            when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
            when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

            UpdateUserSettingsRequest request = UpdateUserSettingsRequest.builder()
                    .copilotToken("github_pat_test123")
                    .build();
            userService.updateSettings(user.getId(), request);

            // Now decrypt
            Optional<String> result = userService.getDecryptedCopilotToken(user.getId());

            assertThat(result).isPresent();
            assertThat(result.get()).isEqualTo("github_pat_test123");
        }

        @Test
        @DisplayName("should throw when user not found")
        void shouldThrowWhenNotFound() {
            UUID unknownId = UUID.randomUUID();
            when(userRepository.findById(unknownId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> userService.getDecryptedCopilotToken(unknownId))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("User not found");
        }
    }

    @Nested
    @DisplayName("getDecryptedBitbucketToken")
    class GetDecryptedBitbucketToken {

        @Test
        @DisplayName("should return empty when no token is set")
        void shouldReturnEmptyWhenNoToken() {
            User user = createSampleUser();
            when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

            Optional<String> result = userService.getDecryptedBitbucketToken(user.getId());

            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("should decrypt and return Bitbucket token when set")
        void shouldDecryptAndReturnToken() {
            User user = createSampleUser();
            when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
            when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

            UpdateUserSettingsRequest request = UpdateUserSettingsRequest.builder()
                    .bitbucketToken("bitbucket-secret-token-xyz")
                    .build();
            userService.updateSettings(user.getId(), request);

            Optional<String> result = userService.getDecryptedBitbucketToken(user.getId());

            assertThat(result).isPresent();
            assertThat(result.get()).isEqualTo("bitbucket-secret-token-xyz");
        }
    }
}
