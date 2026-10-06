package com.albertsp.tripsync.backend.controllers;

import com.albertsp.tripsync.backend.dtos.CreateTaskRequest;
import com.albertsp.tripsync.backend.dtos.TaskResponse;
import com.albertsp.tripsync.backend.dtos.UpdateTaskRequest;
import com.albertsp.tripsync.backend.service.TripTaskService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
public class TaskController {

    private static final String EDIT_TOKEN_HEADER = "X-Edit-Token";

    private final TripTaskService taskService;

    public TaskController(TripTaskService taskService) {
        this.taskService = taskService;
    }

    @GetMapping("/trips/{tripId}/tasks")
    public List<TaskResponse> list(@PathVariable UUID tripId,
                                   @RequestHeader(value = EDIT_TOKEN_HEADER, required = false) String editToken) {
        return taskService.list(tripId, parseToken(editToken));
    }

    @PostMapping("/trips/{tripId}/tasks")
    public ResponseEntity<TaskResponse> create(@PathVariable UUID tripId,
                                               @RequestHeader(value = EDIT_TOKEN_HEADER, required = false) String editToken,
                                               @RequestBody CreateTaskRequest request) {
        TaskResponse created = taskService.create(tripId, parseToken(editToken), request.title());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PatchMapping("/trips/{tripId}/tasks/{taskId}")
    public TaskResponse update(@PathVariable UUID tripId, @PathVariable UUID taskId,
                               @RequestHeader(value = EDIT_TOKEN_HEADER, required = false) String editToken,
                               @RequestBody UpdateTaskRequest request) {
        return taskService.update(tripId, taskId, parseToken(editToken), request.done(), request.claimed());
    }

    /** A malformed token is treated as an unknown one. */
    private static UUID parseToken(String header) {
        if (header == null || header.isBlank()) {
            return null;
        }
        try {
            return UUID.fromString(header.trim());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
