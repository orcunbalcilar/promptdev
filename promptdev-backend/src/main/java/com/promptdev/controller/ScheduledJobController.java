package com.promptdev.controller;

import com.promptdev.dto.CreateScheduledJobRequest;
import com.promptdev.dto.ScheduledJobResponse;
import com.promptdev.dto.TaskResponse;
import com.promptdev.entity.ScheduledJobType;
import com.promptdev.service.ScheduledJobService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST controller for scheduled job management.
 */
@RestController
@RequestMapping("/scheduled-jobs")
@RequiredArgsConstructor
@Slf4j
public class ScheduledJobController {

    private final ScheduledJobService scheduledJobService;

    @GetMapping
    public ResponseEntity<List<ScheduledJobResponse>> getAllJobs(
            @RequestParam(required = false) ScheduledJobType type) {
        List<ScheduledJobResponse> jobs = type != null
                ? scheduledJobService.getJobsByType(type)
                : scheduledJobService.getAllJobs();
        return ResponseEntity.ok(jobs);
    }

    @PostMapping
    public ResponseEntity<ScheduledJobResponse> createJob(@Valid @RequestBody CreateScheduledJobRequest request) {
        log.info("Creating scheduled job: {}", request.getName());
        ScheduledJobResponse response = scheduledJobService.createJob(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{jobId}")
    public ResponseEntity<ScheduledJobResponse> getJob(@PathVariable UUID jobId) {
        return ResponseEntity.ok(scheduledJobService.getJob(jobId));
    }

    @GetMapping("/{jobId}/history")
    public ResponseEntity<List<TaskResponse>> getJobHistory(@PathVariable UUID jobId) {
        return ResponseEntity.ok(scheduledJobService.getJobHistory(jobId));
    }

    @PostMapping("/{jobId}/toggle")
    public ResponseEntity<ScheduledJobResponse> toggleJob(@PathVariable UUID jobId) {
        log.info("Toggling scheduled job: {}", jobId);
        return ResponseEntity.ok(scheduledJobService.toggleJob(jobId));
    }

    @DeleteMapping("/{jobId}")
    public ResponseEntity<Void> deleteJob(@PathVariable UUID jobId) {
        log.info("Deleting scheduled job: {}", jobId);
        scheduledJobService.deleteJob(jobId);
        return ResponseEntity.noContent().build();
    }
}
