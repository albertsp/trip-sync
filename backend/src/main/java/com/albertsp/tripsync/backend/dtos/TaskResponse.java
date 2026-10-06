package com.albertsp.tripsync.backend.dtos;

import com.albertsp.tripsync.backend.domain.TripTask;

import java.util.UUID;

/** {@code mine} tells the caller (identified by edit token) that the task is assigned to them. */
public record TaskResponse(UUID id, String title, UUID assigneeId, String assigneeName, boolean done, boolean mine) {

    public static TaskResponse from(TripTask task, UUID callerParticipantId) {
        return new TaskResponse(
                task.getId(),
                task.getTitle(),
                task.getAssignee() == null ? null : task.getAssignee().getId(),
                task.getAssignee() == null ? null : task.getAssignee().getName(),
                task.isDone(),
                task.getAssignee() != null && task.getAssignee().getId().equals(callerParticipantId));
    }
}
