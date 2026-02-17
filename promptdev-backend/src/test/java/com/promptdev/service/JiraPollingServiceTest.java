package com.promptdev.service;

import com.promptdev.config.JiraConfig;
import com.promptdev.dto.CreateTaskRequest;
import com.promptdev.dto.jira.JiraIssueResponse;
import com.promptdev.dto.jira.JiraSearchResponse;
import com.promptdev.entity.TaskStatus;
import com.promptdev.entity.User;
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

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class JiraPollingServiceTest {

    @Mock
    private JiraService jiraService;
    @Mock
    private JiraConfig jiraConfig;
    @Mock
    private TaskService taskService;
    @Mock
    private TaskRepository taskRepository;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private JiraPollingService jiraPollingService;

    private static final String ISSUE_KEY = "PROJ-123";
    private User user;
    private JiraIssueResponse issue;

    @BeforeEach
    void setUp() {
        user = User.builder()
            .id(UUID.randomUUID())
            .jiraUsername("testuser")
            .jiraAutoTaskEnabled(true)
            .build();

        JiraIssueResponse.JiraPriority priority = new JiraIssueResponse.JiraPriority("Medium", "3");
        JiraIssueResponse.JiraIssueFields fields = new JiraIssueResponse.JiraIssueFields(
            "Test Issue", 
            null, 
            priority, 
            null, 
            null, 
            "Description", 
            null, 
            null
        );
        issue = new JiraIssueResponse("1000", ISSUE_KEY, fields);
    }

    @Test
    @DisplayName("Should create task with default settings when user settings are null")
    void shouldCreateTaskWithDefaults() {
        when(userRepository.findByJiraAutoTaskEnabledTrue()).thenReturn(List.of(user));
        when(jiraService.searchIssues(anyString(), anyInt(), anyInt()))
            .thenReturn(new JiraSearchResponse(0, 50, 1, List.of(issue)));
        when(taskRepository.existsByJiraIssueKeyAndStatusNotIn(eq(ISSUE_KEY), anyList()))
            .thenReturn(false);

        jiraPollingService.pollAndCreateTasks();

        ArgumentCaptor<CreateTaskRequest> captor = ArgumentCaptor.forClass(CreateTaskRequest.class);
        verify(taskService).createTask(captor.capture());

        CreateTaskRequest request = captor.getValue();
        assertThat(request.getIterative()).isTrue();
        assertThat(request.getMaxIterations()).isEqualTo(1);
        assertThat(request.getReviewEnabled()).isTrue();
        assertThat(request.getPrompt()).contains("## Jira Issue: " + ISSUE_KEY);
    }

    @Test
    @DisplayName("Should create task with user custom settings")
    void shouldCreateTaskWithCustomSettings() {
        user.setJiraAutoTaskIterative(false);
        user.setJiraAutoTaskMaxIterations(5);
        user.setJiraAutoTaskReviewEnabled(false);
        user.setJiraAutoTaskPrompt("Custom prompt for {{issueKey}}: {{summary}}");

        when(userRepository.findByJiraAutoTaskEnabledTrue()).thenReturn(List.of(user));
        when(jiraService.searchIssues(anyString(), anyInt(), anyInt()))
            .thenReturn(new JiraSearchResponse(0, 50, 1, List.of(issue)));
        when(taskRepository.existsByJiraIssueKeyAndStatusNotIn(eq(ISSUE_KEY), anyList()))
            .thenReturn(false);

        jiraPollingService.pollAndCreateTasks();

        ArgumentCaptor<CreateTaskRequest> captor = ArgumentCaptor.forClass(CreateTaskRequest.class);
        verify(taskService).createTask(captor.capture());

        CreateTaskRequest request = captor.getValue();
        assertThat(request.getIterative()).isFalse();
        assertThat(request.getMaxIterations()).isEqualTo(5);
        assertThat(request.getReviewEnabled()).isFalse();
        assertThat(request.getPrompt()).isEqualTo("Custom prompt for " + ISSUE_KEY + ": Test Issue");
    }

    @Test
    @DisplayName("Should check against updated terminal statuses excluding CANCELLED")
    void shouldCheckAgainstUpdatedTerminalStatuses() {
        when(userRepository.findByJiraAutoTaskEnabledTrue()).thenReturn(List.of(user));
        when(jiraService.searchIssues(anyString(), anyInt(), anyInt()))
            .thenReturn(new JiraSearchResponse(0, 50, 1, List.of(issue)));
        when(taskRepository.existsByJiraIssueKeyAndStatusNotIn(eq(ISSUE_KEY), anyList()))
            .thenReturn(true); // Task exists in non-terminal state

        jiraPollingService.pollAndCreateTasks();

        ArgumentCaptor<List<TaskStatus>> statusCaptor = ArgumentCaptor.forClass(List.class);
        verify(taskRepository).existsByJiraIssueKeyAndStatusNotIn(eq(ISSUE_KEY), statusCaptor.capture());

        List<TaskStatus> terminalStatuses = statusCaptor.getValue();
        assertThat(terminalStatuses).containsExactlyInAnyOrder(TaskStatus.FAILED, TaskStatus.COMPLETED);
        assertThat(terminalStatuses).doesNotContain(TaskStatus.CANCELLED);
        
        // Since exists returns true, createTask should NOT be called
        verify(taskService, never()).createTask(any());
    }
}
