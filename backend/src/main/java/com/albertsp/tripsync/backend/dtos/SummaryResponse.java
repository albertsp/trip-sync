package com.albertsp.tripsync.backend.dtos;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

public record SummaryResponse(Map<LocalDate, Long> availabilityByDate, BigDecimal budget) {
}
