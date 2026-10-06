package com.albertsp.tripsync.backend.dtos;

/**
 * Partial update of a task: absent fields stay as they are.
 * {@code claimed=true} assigns the task to the caller and {@code claimed=false} releases it; nobody can assign others.
 */
public record UpdateTaskRequest(Boolean done, Boolean claimed) {
}
