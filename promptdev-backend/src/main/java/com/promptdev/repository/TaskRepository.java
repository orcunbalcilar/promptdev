package com.promptdev.repository;

import com.promptdev.entity.Task;
import com.promptdev.entity.TaskStatus;
import com.promptdev.entity.WorkspaceType;
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
public interface TaskRepository extends JpaRepository<Task, UUID> {

    Page<Task> findAllByOrderByCreatedAtDesc(Pageable pageable);

    List<Task> findByStatus(TaskStatus status);

    List<Task> findByStatusIn(List<TaskStatus> statuses);

    @Query("SELECT t FROM Task t WHERE t.status IN :statuses ORDER BY t.createdAt ASC")
    List<Task> findPendingTasks(@Param("statuses") List<TaskStatus> statuses);

    @Query("SELECT t FROM Task t WHERE t.repositorySlug = :repositorySlug ORDER BY t.createdAt DESC")
    List<Task> findByRepositorySlug(@Param("repositorySlug") String repositorySlug);

    @Query("SELECT t FROM Task t WHERE t.createdAt >= :since ORDER BY t.createdAt DESC")
    List<Task> findRecentTasks(@Param("since") LocalDateTime since);

    @Query("SELECT COUNT(t) FROM Task t WHERE t.status = :status")
    long countByStatus(@Param("status") TaskStatus status);

    List<Task> findByScheduledJobIdOrderByCreatedAtDesc(UUID scheduledJobId);

    List<Task> findByIterativeTrueAndStatusIn(List<TaskStatus> statuses);

    List<Task> findByWorkspaceTypeOrderByCreatedAtDesc(WorkspaceType workspaceType);
}
