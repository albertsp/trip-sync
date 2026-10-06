package com.albertsp.tripsync.backend.domain;

import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.UUID;

/** One item of the trip's shared checklist. */
@Entity
@Table(name = "trip_tasks", indexes = {
        @Index(name = "idx_trip_tasks_trip", columnList = "trip_id")
})
public class TripTask {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "trip_id")
    private Trip trip;

    private String title;

    @ManyToOne
    @JoinColumn(name = "assignee_id")
    private Participant assignee;

    private boolean done;

    /** True for tasks proposed by the AI; regenerating the plan replaces the ones nobody has touched. */
    private boolean suggested;

    private LocalDateTime createdAt;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Trip getTrip() {
        return trip;
    }

    public void setTrip(Trip trip) {
        this.trip = trip;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public Participant getAssignee() {
        return assignee;
    }

    public void setAssignee(Participant assignee) {
        this.assignee = assignee;
    }

    public boolean isDone() {
        return done;
    }

    public void setDone(boolean done) {
        this.done = done;
    }

    public boolean isSuggested() {
        return suggested;
    }

    public void setSuggested(boolean suggested) {
        this.suggested = suggested;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
