package com.promptdev.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Tracks Copilot SDK sessions for monitoring and analytics.
 */
@Entity
@Table(name = "copilot_sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"task", "operations"})
public class CopilotSession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** The Copilot SDK session ID (from nanoid) */
    @Column(name = "sdk_session_id", nullable = false, unique = true)
    private String sdkSessionId;

    /** The model used for this session */
    @Column(nullable = false)
    private String model;

    /** Reasoning effort level */
    @Column(name = "reasoning_effort")
    private String reasoningEffort;

    /** Optional task association */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id")
    private Task task;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private CopilotSessionStatus status = CopilotSessionStatus.ACTIVE;

    /** Total tokens used (input) */
    @Column(name = "total_input_tokens")
    @Builder.Default
    private Long totalInputTokens = 0L;

    /** Total tokens used (output) */
    @Column(name = "total_output_tokens")
    @Builder.Default
    private Long totalOutputTokens = 0L;

    /** Total number of messages exchanged */
    @Column(name = "message_count")
    @Builder.Default
    private Integer messageCount = 0;

    /** Total tool executions in session */
    @Column(name = "tool_execution_count")
    @Builder.Default
    private Integer toolExecutionCount = 0;

    /** Total errors encountered */
    @Column(name = "error_count")
    @Builder.Default
    private Integer errorCount = 0;

    /** Source of session creation (web, slack, api, cli) */
    @Column(name = "source")
    @Builder.Default
    private String source = "web";

    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("timestamp ASC")
    @Builder.Default
    private List<CopilotOperation> operations = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        CopilotSession session = (CopilotSession) o;
        return id != null && id.equals(session.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
