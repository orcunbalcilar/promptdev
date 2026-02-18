package com.promptdev.service;

import com.promptdev.entity.*;
import com.promptdev.mapper.TaskMapper;
import com.promptdev.repository.JiraIssueOptOutRepository;
import com.promptdev.repository.TaskEventRepository;
import com.promptdev.repository.TaskRepository;
import com.promptdev.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TaskServiceOptOutTest {

    @Mock
    private TaskRepository taskRepository;
    @Mock
    private TaskEventRepository taskEventRepository;
    @Mock
    private TaskMapper taskMapper;
    @Mock
    private SseService sseService;
    @Mock
    private BitbucketService bitbucketService;
    @Mock
    private UserRepository userRepository;
    @Mock
    private JiraIssueOptOutRepository jiraIssueOptOutRepository;

    @InjectMocks
    private TaskService taskService;

    private static final String ISSUE_KEY = "PROJ-123";
    private Task task;
    private User user;
    private UUID taskId;
    private UUID userId;

    @BeforeEach
    void setUp() {
        taskId = UUID.randomUUID();
        userId = UUID.randomUUID();
        
        user = User.builder()
            .id(userId)
            .email("test@example.com")
            .name("Test User")
            .build();

        task = Task.builder()
            .id(taskId)
            .title("Test Task")
            .status(TaskStatus.IN_PROGRESS)
            .jiraIssueKey(ISSUE_KEY)
            .user(user)
            .build();
    }

    @Test
    @DisplayName("Should create opt-out when cancelling task with Jira issue")
    void shouldCreateOptOutWhenCancellingTaskWithJiraIssue() {
        when(taskRepository.findById(taskId)).thenReturn(Optional.of(task));
        when(jiraIssueOptOutRepository.existsByUserAndJiraIssueKey(user, ISSUE_KEY))
            .thenReturn(false);
        when(taskRepository.save(any(Task.class))).thenReturn(task);

        taskService.cancelTask(taskId);

        // Verify opt-out was created
        ArgumentCaptor<JiraIssueOptOut> captor = ArgumentCaptor.forClass(JiraIssueOptOut.class);
        verify(jiraIssueOptOutRepository).save(captor.capture());

        JiraIssueOptOut optOut = captor.getValue();
        assertThat(optOut.getUser()).isEqualTo(user);
        assertThat(optOut.getJiraIssueKey()).isEqualTo(ISSUE_KEY);
        assertThat(optOut.getReason()).isEqualTo("User cancelled task manually");

        // Verify task was cancelled
        ArgumentCaptor<Task> taskCaptor = ArgumentCaptor.forClass(Task.class);
        verify(taskRepository).save(taskCaptor.capture());
        assertThat(taskCaptor.getValue().getStatus()).isEqualTo(TaskStatus.CANCELLED);
    }

    @Test
    @DisplayName("Should not create duplicate opt-out if already exists")
    void shouldNotCreateDuplicateOptOut() {
        when(taskRepository.findById(taskId)).thenReturn(Optional.of(task));
        when(jiraIssueOptOutRepository.existsByUserAndJiraIssueKey(user, ISSUE_KEY))
            .thenReturn(true); // Opt-out already exists
        when(taskRepository.save(any(Task.class))).thenReturn(task);

        taskService.cancelTask(taskId);

        // Verify opt-out was NOT created again
        verify(jiraIssueOptOutRepository, never()).save(any());
        
        // But task should still be cancelled
        verify(taskRepository).save(any(Task.class));
    }

    @Test
    @DisplayName("Should not create opt-out when task has no Jira issue")
    void shouldNotCreateOptOutWhenNoJiraIssue() {
        task.setJiraIssueKey(null);
        when(taskRepository.findById(taskId)).thenReturn(Optional.of(task));
        when(taskRepository.save(any(Task.class))).thenReturn(task);

        taskService.cancelTask(taskId);

        // Verify no opt-out was created
        verify(jiraIssueOptOutRepository, never()).existsByUserAndJiraIssueKey(any(), any());
        verify(jiraIssueOptOutRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should not create opt-out when task has no user")
    void shouldNotCreateOptOutWhenNoUser() {
        task.setUser(null);
        when(taskRepository.findById(taskId)).thenReturn(Optional.of(task));
        when(taskRepository.save(any(Task.class))).thenReturn(task);

        taskService.cancelTask(taskId);

        // Verify no opt-out was created
        verify(jiraIssueOptOutRepository, never()).existsByUserAndJiraIssueKey(any(), any());
        verify(jiraIssueOptOutRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should not create opt-out when Jira issue key is blank")
    void shouldNotCreateOptOutWhenJiraIssueKeyIsBlank() {
        task.setJiraIssueKey("  ");
        when(taskRepository.findById(taskId)).thenReturn(Optional.of(task));
        when(taskRepository.save(any(Task.class))).thenReturn(task);

        taskService.cancelTask(taskId);

        // Verify no opt-out was created
        verify(jiraIssueOptOutRepository, never()).existsByUserAndJiraIssueKey(any(), any());
        verify(jiraIssueOptOutRepository, never()).save(any());
    }
}
