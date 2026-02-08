package com.promptdev.repository;

import com.promptdev.entity.CopilotSession;
import com.promptdev.entity.CopilotSessionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CopilotSessionRepository extends JpaRepository<CopilotSession, UUID> {

    Optional<CopilotSession> findBySdkSessionId(String sdkSessionId);

    List<CopilotSession> findByStatus(CopilotSessionStatus status);

    Page<CopilotSession> findAllByOrderByCreatedAtDesc(Pageable pageable);

    List<CopilotSession> findByTaskId(UUID taskId);

    @Query("SELECT s FROM CopilotSession s WHERE s.createdAt >= :since ORDER BY s.createdAt DESC")
    List<CopilotSession> findRecentSessions(@Param("since") LocalDateTime since);

    @Query("SELECT COUNT(s) FROM CopilotSession s WHERE s.status = :status")
    long countByStatus(@Param("status") CopilotSessionStatus status);

    @Query("SELECT SUM(s.totalInputTokens) FROM CopilotSession s WHERE s.createdAt >= :since")
    Long totalInputTokensSince(@Param("since") LocalDateTime since);

    @Query("SELECT SUM(s.totalOutputTokens) FROM CopilotSession s WHERE s.createdAt >= :since")
    Long totalOutputTokensSince(@Param("since") LocalDateTime since);

    @Query("SELECT s.model, COUNT(s) FROM CopilotSession s WHERE s.createdAt >= :since GROUP BY s.model")
    List<Object[]> countByModelSince(@Param("since") LocalDateTime since);

    @Query("SELECT s.source, COUNT(s) FROM CopilotSession s WHERE s.createdAt >= :since GROUP BY s.source")
    List<Object[]> countBySourceSince(@Param("since") LocalDateTime since);
}
