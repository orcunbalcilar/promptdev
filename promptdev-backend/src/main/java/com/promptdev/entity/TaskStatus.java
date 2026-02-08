package com.promptdev.entity;

/**
 * Status of a development task.
 */
public enum TaskStatus {
    PENDING,
    QUEUED,
    IN_PROGRESS,
    CODE_GENERATED,
    COMMITTING,
    PUSHING,
    CREATING_PR,
    COMPLETED,
    FAILED,
    CANCELLED,
    /** Iterative session: waiting for next iteration */
    ITERATION_PENDING,
    /** Iterative session: validating step completion */
    VALIDATING
}
