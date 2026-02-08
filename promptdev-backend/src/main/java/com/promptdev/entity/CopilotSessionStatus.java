package com.promptdev.entity;

/**
 * Status of a Copilot session.
 */
public enum CopilotSessionStatus {
    ACTIVE,
    IDLE,
    PROCESSING,
    STREAMING,
    ERROR,
    DESTROYED
}
