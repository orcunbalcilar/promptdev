package com.promptdev.mapper;

import com.promptdev.dto.TaskEventResponse;
import com.promptdev.dto.TaskResponse;
import com.promptdev.entity.Task;
import com.promptdev.entity.TaskEvent;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Mapper for converting entities to DTOs.
 */
@Component
public class TaskMapper {

    public TaskResponse toResponse(Task task) {
        return toResponseBuilder(task)
                .events(toEventResponses(task.getEvents()))
                .build();
    }

    public TaskResponse toResponseWithoutEvents(Task task) {
        return toResponseBuilder(task).build();
    }

    private TaskResponse.TaskResponseBuilder toResponseBuilder(Task task) {
        return TaskResponse.builder()
                .id(task.getId())
                .title(task.getTitle())
                .prompt(task.getPrompt())
                .repositorySlug(task.getRepositorySlug())
                .workspaceType(task.getWorkspaceType())
                .workspacePath(task.getWorkspacePath())
                .sourceBranch(task.getSourceBranch())
                .targetBranch(task.getTargetBranch())
                .status(task.getStatus())
                .currentAttempt(task.getCurrentAttempt())
                .maxAttempts(task.getMaxAttempts())
                .modelId(task.getModelId())
                .copilotSessionId(task.getCopilotSessionId())
                .pullRequestId(task.getPullRequestId())
                .pullRequestUrl(task.getPullRequestUrl())
                .errorMessage(task.getErrorMessage())
                .iterative(task.getIterative())
                .maxIterations(task.getMaxIterations())
                .currentIteration(task.getCurrentIteration())
                .currentStepIndex(task.getCurrentStepIndex())
                .completionCriteria(task.getCompletionCriteria())
                .steps(task.getSteps())
                .scheduledJobId(task.getScheduledJobId())
                .createdAt(task.getCreatedAt())
                .updatedAt(task.getUpdatedAt())
                .completedAt(task.getCompletedAt());
    }

    public TaskEventResponse toEventResponse(TaskEvent event) {
        return TaskEventResponse.builder()
                .id(event.getId())
                .eventType(event.getEventType())
                .message(event.getMessage())
                .details(event.getDetails())
                .codeSnippet(event.getCodeSnippet())
                .filePath(event.getFilePath())
                .timestamp(event.getTimestamp())
                .build();
    }

    public List<TaskEventResponse> toEventResponses(List<TaskEvent> events) {
        if (events == null) {
            return List.of();
        }
        return events.stream()
            .map(this::toEventResponse)
            .toList();
    }
}
