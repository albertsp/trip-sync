package com.albertsp.tripsync.backend.dtos;

import com.albertsp.tripsync.backend.domain.TripStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public record TripResponse(UUID id, String title, LocalDate windowStart, LocalDate windowEnd, TripStatus status, LocalDateTime createdAt) {
}
