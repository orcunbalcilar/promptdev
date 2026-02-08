package com.promptdev.repository;

import com.promptdev.entity.ScheduledJob;
import com.promptdev.entity.ScheduledJobType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface ScheduledJobRepository extends JpaRepository<ScheduledJob, UUID> {

    List<ScheduledJob> findByEnabledTrueOrderByNextRunAtAsc();

    List<ScheduledJob> findByJobType(ScheduledJobType jobType);

    @Query("SELECT j FROM ScheduledJob j WHERE j.enabled = true AND j.nextRunAt <= :now")
    List<ScheduledJob> findDueJobs(@Param("now") LocalDateTime now);

    List<ScheduledJob> findByWorkspaceRefOrderByCreatedAtDesc(String workspaceRef);
}
