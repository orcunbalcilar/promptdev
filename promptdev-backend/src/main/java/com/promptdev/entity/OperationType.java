package com.promptdev.entity;

/**
 * Types of operations tracked in the monitoring system.
 */
public enum OperationType {
    // Session lifecycle
    SESSION_CREATED,
    SESSION_DESTROYED,
    SESSION_ERROR,

    // Message operations
    MESSAGE_SENT,
    MESSAGE_RECEIVED,
    MESSAGE_STREAMING,

    // Tool operations
    TOOL_EXECUTION_START,
    TOOL_EXECUTION_END,
    TOOL_EXECUTION_ERROR,

    // Reasoning
    REASONING_START,
    REASONING_END,

    // Task operations
    TASK_CREATED,
    TASK_STARTED,
    TASK_COMPLETED,
    TASK_FAILED,
    TASK_CANCELLED,

    // Git operations
    GIT_CLONE,
    GIT_BRANCH,
    GIT_COMMIT,
    GIT_PUSH,
    PR_CREATED,

    // External integrations
    SLACK_MESSAGE_RECEIVED,
    SLACK_TASK_CREATED,
    CLI_COMMAND_EXECUTED,
    MODEL_CHANGED,
    CODE_REVIEW_STARTED,

    // System
    ERROR,
    WARNING
}
