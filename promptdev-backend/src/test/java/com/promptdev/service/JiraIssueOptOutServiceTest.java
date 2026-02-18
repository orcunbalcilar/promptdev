package com.promptdev.service;

import com.promptdev.dto.JiraIssueOptOutResponse;
import com.promptdev.entity.JiraIssueOptOut;
import com.promptdev.entity.User;
import com.promptdev.mapper.JiraIssueOptOutMapper;
import com.promptdev.repository.JiraIssueOptOutRepository;
import com.promptdev.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class JiraIssueOptOutServiceTest {

    @Mock
    private JiraIssueOptOutRepository optOutRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private JiraIssueOptOutMapper optOutMapper;

    @InjectMocks
    private JiraIssueOptOutService optOutService;

    private static final String ISSUE_KEY = "PROJ-123";
    private User user;
    private UUID userId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        user = User.builder()
            .id(userId)
            .email("test@example.com")
            .name("Test User")
            .build();
    }

    @Test
    @DisplayName("Should create opt-out successfully")
    void shouldCreateOptOut() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(optOutRepository.existsByUserAndJiraIssueKey(user, ISSUE_KEY)).thenReturn(false);
        
        JiraIssueOptOut savedOptOut = JiraIssueOptOut.builder()
            .id(UUID.randomUUID())
            .user(user)
            .jiraIssueKey(ISSUE_KEY)
            .reason("Test reason")
            .build();
        when(optOutRepository.save(any(JiraIssueOptOut.class))).thenReturn(savedOptOut);
        
        JiraIssueOptOutResponse response = JiraIssueOptOutResponse.builder()
            .id(savedOptOut.getId())
            .userId(userId)
            .jiraIssueKey(ISSUE_KEY)
            .reason("Test reason")
            .build();
        when(optOutMapper.toResponse(savedOptOut)).thenReturn(response);

        JiraIssueOptOutResponse result = optOutService.createOptOut(userId, ISSUE_KEY, "Test reason");

        assertThat(result).isNotNull();
        assertThat(result.getJiraIssueKey()).isEqualTo(ISSUE_KEY);
        assertThat(result.getUserId()).isEqualTo(userId);
        
        ArgumentCaptor<JiraIssueOptOut> captor = ArgumentCaptor.forClass(JiraIssueOptOut.class);
        verify(optOutRepository).save(captor.capture());
        
        JiraIssueOptOut captured = captor.getValue();
        assertThat(captured.getUser()).isEqualTo(user);
        assertThat(captured.getJiraIssueKey()).isEqualTo(ISSUE_KEY);
        assertThat(captured.getReason()).isEqualTo("Test reason");
    }

    @Test
    @DisplayName("Should throw exception when user not found")
    void shouldThrowWhenUserNotFound() {
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> optOutService.createOptOut(userId, ISSUE_KEY, "Test"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("User not found");

        verify(optOutRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should throw exception when opt-out already exists")
    void shouldThrowWhenOptOutAlreadyExists() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(optOutRepository.existsByUserAndJiraIssueKey(user, ISSUE_KEY)).thenReturn(true);

        assertThatThrownBy(() -> optOutService.createOptOut(userId, ISSUE_KEY, "Test"))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("already opted out");

        verify(optOutRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should delete opt-out successfully")
    void shouldDeleteOptOut() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        optOutService.deleteOptOut(userId, ISSUE_KEY);

        verify(optOutRepository).deleteByUserAndJiraIssueKey(user, ISSUE_KEY);
    }

    @Test
    @DisplayName("Should check if user has opted out")
    void shouldCheckIfUserHasOptedOut() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(optOutRepository.existsByUserAndJiraIssueKey(user, ISSUE_KEY)).thenReturn(true);

        boolean result = optOutService.hasOptedOut(userId, ISSUE_KEY);

        assertThat(result).isTrue();
    }

    @Test
    @DisplayName("Should return false when user not found")
    void shouldReturnFalseWhenUserNotFound() {
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        boolean result = optOutService.hasOptedOut(userId, ISSUE_KEY);

        assertThat(result).isFalse();
        verify(optOutRepository, never()).existsByUserAndJiraIssueKey(any(), any());
    }

    @Test
    @DisplayName("Should get all opt-outs for user")
    void shouldGetUserOptOuts() {
        JiraIssueOptOut optOut1 = JiraIssueOptOut.builder()
            .id(UUID.randomUUID())
            .user(user)
            .jiraIssueKey("PROJ-123")
            .build();
        JiraIssueOptOut optOut2 = JiraIssueOptOut.builder()
            .id(UUID.randomUUID())
            .user(user)
            .jiraIssueKey("PROJ-456")
            .build();

        when(optOutRepository.findByUserIdOrderByCreatedAtDesc(userId))
            .thenReturn(List.of(optOut1, optOut2));
        
        when(optOutMapper.toResponse(any())).thenAnswer(inv -> {
            JiraIssueOptOut opt = inv.getArgument(0);
            return JiraIssueOptOutResponse.builder()
                .id(opt.getId())
                .userId(userId)
                .jiraIssueKey(opt.getJiraIssueKey())
                .build();
        });

        List<JiraIssueOptOutResponse> result = optOutService.getUserOptOuts(userId);

        assertThat(result).hasSize(2);
        assertThat(result).extracting(JiraIssueOptOutResponse::getJiraIssueKey)
            .containsExactly("PROJ-123", "PROJ-456");
    }
}
