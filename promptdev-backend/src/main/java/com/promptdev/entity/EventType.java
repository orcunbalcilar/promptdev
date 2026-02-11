package com.promptdev.entity;

/**
 * Types of events that can occur during task processing.
 */
public enum EventType {
    TASK_CREATED,
    TASK_QUEUED,
    AGENT_STARTED,
    AGENT_THINKING,
    CODE_GENERATING,
    CODE_GENERATED,
    FILE_CREATED,
    FILE_MODIFIED,
    FILE_DELETED,
    GIT_CHECKOUT,
    GIT_BRANCH_CREATED,
    GIT_COMMIT,
    GIT_PUSH,
    PR_CREATED,
    TASK_COMPLETED,
    TASK_FAILED,
    RETRY_SCHEDULED,
    ERROR,
    // General progress event
    PROGRESS,
    // Iterative session events
    ITERATION_STARTED,
    ITERATION_COMPLETED,
    ITERATION_FAILED,
    STEP_STARTED,
    STEP_COMPLETED,
    STEP_FAILED,
    STEP_VALIDATION_PASSED,
    STEP_VALIDATION_FAILED,
    TESTS_RUNNING,
    TESTS_PASSED,
    TESTS_FAILED,
    // Review events
    REVIEWING_STARTED,
    REVIEWING_COMPLETED,
    REVIEWING_FAILED,
    // Triage events
    TRIAGING_STARTED,
    TRIAGING_COMPLETED,
    // Agent action events
    DEPENDENCY_INSTALLED,
    AGENT_TOOL_CALL,
    AGENT_TOOL_RESULT,
    COMMAND_EXECUTED,
    TEST_RESULT
}
