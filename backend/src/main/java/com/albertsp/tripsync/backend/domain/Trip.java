package com.albertsp.tripsync.backend.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "trips")
public class Trip {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private String title;
    private LocalDate windowStart;
    private LocalDate windowEnd;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @Enumerated(EnumType.STRING)
    private TripStatus status = TripStatus.OPEN;

    @ManyToOne
    @JoinColumn(name = "creator_id")
    private User creator;



    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public LocalDate getWindowStart() {
        return windowStart;
    }

    public void setWindowStart(LocalDate windowStart) {
        this.windowStart = windowStart;
    }

    public LocalDate getWindowEnd() {
        return windowEnd;
    }

    public void setWindowEnd(LocalDate windowEnd) {
        this.windowEnd = windowEnd;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public TripStatus getStatus() {
        return status;
    }

    public void setStatus(TripStatus status) {
        this.status = status;
    }

    public User getCreator() {
        return creator;
    }

    public void setCreator(User creator) {
        this.creator = creator;
    }
}
