package com.albertsp.tripsync.backend.dtos;

import com.albertsp.tripsync.backend.domain.TripCurrency;

import java.math.BigDecimal;
import java.util.UUID;

public record ParticipantResponse(UUID id, String name, BigDecimal budgetAmount, TripCurrency budgetCurrency, UUID editToken) {
}
