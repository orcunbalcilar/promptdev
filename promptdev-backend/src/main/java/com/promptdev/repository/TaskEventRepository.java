package com.promptdev.repository;

import com.promptdev.entity.EventType;
import com.promptdev.entity.TaskEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface TaskEventRepository extends JpaRepository<TaskEvent, UUID> {

    @Query("SELECT e FROM TaskEvent e WHERE e.task.id = :taskId ORDER BY e.timestamp ASC")
    List<TaskEvent> findByTaskIdOrderByTimestampAsc(@Param("taskId") UUID taskId);

    @Query("SELECT e FROM TaskEvent e WHERE e.task.id = :taskId AND e.timestamp > :since ORDER BY e.timestamp ASC")
    List<TaskEvent> findByTaskIdAndTimestampAfter(@Param("taskId") UUID taskId, @Param("since") LocalDateTime since);

    List<TaskEvent> findByEventType(EventType eventType);

    @Query("SELECT e FROM TaskEvent e WHERE e.task.id = :taskId ORDER BY e.timestamp DESC LIMIT 1")
    TaskEvent findLatestByTaskId(@Param("taskId") UUID taskId);
}
