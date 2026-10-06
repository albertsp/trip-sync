package com.albertsp.tripsync.backend.dtos;


import com.albertsp.tripsync.backend.domain.Trip;
import com.albertsp.tripsync.backend.domain.TripStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public record TripResponse(UUID id, String title, LocalDate windowStart, LocalDate windowEnd, TripStatus status, LocalDateTime createdAt, UUID creatorId, Integer preferredDurationDays) {
    public static TripResponse from(Trip trip) {
        return new TripResponse(
                trip.getId(),
                trip.getTitle(),
                trip.getWindowStart(),
                trip.getWindowEnd(),
                trip.getStatus(),
                trip.getCreatedAt(),
                trip.getCreator().getId(),
                trip.getPreferredDurationDays()
        );
    }
}
