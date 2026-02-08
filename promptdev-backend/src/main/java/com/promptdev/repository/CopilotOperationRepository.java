package com.promptdev.repository;

import com.promptdev.entity.CopilotOperation;
import com.promptdev.entity.OperationType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface CopilotOperationRepository extends JpaRepository<CopilotOperation, UUID> {

    List<CopilotOperation> findBySessionIdOrderByTimestampAsc(UUID sessionId);

    Page<CopilotOperation> findAllByOrderByTimestampDesc(Pageable pageable);

    List<CopilotOperation> findByOperationType(OperationType operationType);

    List<CopilotOperation> findByTaskIdOrderByTimestampAsc(UUID taskId);

    @Query("SELECT o FROM CopilotOperation o WHERE o.success = false ORDER BY o.timestamp DESC")
    Page<CopilotOperation> findErrors(Pageable pageable);

    @Query("SELECT o.operationType, COUNT(o) FROM CopilotOperation o WHERE o.timestamp >= :since GROUP BY o.operationType")
    List<Object[]> countByTypeSince(@Param("since") LocalDateTime since);

    @Query("SELECT o.toolName, COUNT(o), AVG(o.durationMs) FROM CopilotOperation o " +
           "WHERE o.toolName IS NOT NULL AND o.timestamp >= :since GROUP BY o.toolName ORDER BY COUNT(o) DESC")
    List<Object[]> toolUsageStatsSince(@Param("since") LocalDateTime since);

    @Query("SELECT SUM(o.inputTokens), SUM(o.outputTokens) FROM CopilotOperation o WHERE o.timestamp >= :since")
    Object[] totalTokensSince(@Param("since") LocalDateTime since);

    @Query("SELECT CAST(o.timestamp AS date), COUNT(o) FROM CopilotOperation o " +
           "WHERE o.timestamp >= :since GROUP BY CAST(o.timestamp AS date) ORDER BY CAST(o.timestamp AS date)")
    List<Object[]> dailyOperationCounts(@Param("since") LocalDateTime since);

    @Query("SELECT o.source, COUNT(o) FROM CopilotOperation o WHERE o.timestamp >= :since GROUP BY o.source")
    List<Object[]> countBySourceSince(@Param("since") LocalDateTime since);
}
