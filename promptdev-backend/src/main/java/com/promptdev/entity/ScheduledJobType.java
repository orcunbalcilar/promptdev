package com.promptdev.entity;

/**
 * Type of scheduled job.
 */
public enum ScheduledJobType {
    /** Regular maintenance (dependency updates, cleanup) */
    MAINTENANCE,
    /** Code review and quality checks */
    CODE_REVIEW,
    /** Increase unit test coverage */
    TEST_COVERAGE,
    /** Security audit */
    SECURITY_AUDIT,
    /** Performance optimization */
    PERFORMANCE,
    /** Documentation updates */
    DOCUMENTATION,
    /** Custom user-defined job */
    CUSTOM
}
