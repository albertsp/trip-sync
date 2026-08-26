package com.albertsp.tripsync.backend.dtos;

import java.time.LocalDate;

public record CreateTripRequest(String title, LocalDate windowStart, LocalDate windowEnd) {
}
