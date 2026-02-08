package com.promptdev.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Tracks individual operations within a Copilot session.
 * This provides granular monitoring of every action taken.
 */
@Entity
@Table(name = "copilot_operations", indexes = {
    @Index(name = "idx_operations_session", columnList = "session_id"),
    @Index(name = "idx_operations_type", columnList = "operation_type"),
    @Index(name = "idx_operations_timestamp", columnList = "timestamp")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"session", "task"})
public class CopilotOperation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id")
    private CopilotSession session;

    /** Optional task association */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id")
    private Task task;

    @Enumerated(EnumType.STRING)
    @Column(name = "operation_type", nullable = false)
    private OperationType operationType;

    /** Human-readable description */
    @Column(columnDefinition = "TEXT")
    private String message;

    /** JSON payload with operation-specific details */
    @Column(columnDefinition = "TEXT")
    private String details;

    /** Tool name for tool operations */
    @Column(name = "tool_name")
    private String toolName;

    /** Model used for the operation */
    @Column
    private String model;

    /** Input tokens consumed */
    @Column(name = "input_tokens")
    private Long inputTokens;

    /** Output tokens consumed */
    @Column(name = "output_tokens")
    private Long outputTokens;

    /** Duration of the operation in milliseconds */
    @Column(name = "duration_ms")
    private Long durationMs;

    /** Whether the operation succeeded */
    @Column
    @Builder.Default
    private Boolean success = true;

    /** Error message if failed */
    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    /** Source of the operation (web, slack, cli, api) */
    @Column
    @Builder.Default
    private String source = "web";

    /** IP address or identifier of the client */
    @Column(name = "client_info")
    private String clientInfo;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime timestamp;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        CopilotOperation op = (CopilotOperation) o;
        return id != null && id.equals(op.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
