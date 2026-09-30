package com.albertsp.tripsync.backend.dtos;

import com.albertsp.tripsync.backend.domain.DestinationType;
import com.albertsp.tripsync.backend.domain.Interest;
import com.albertsp.tripsync.backend.domain.TripCurrency;

import java.math.BigDecimal;
import java.util.Set;
import java.util.UUID;

public record ParticipantResponse(UUID id, String name, BigDecimal budgetAmount, TripCurrency budgetCurrency, UUID editToken, DestinationType destinationType, String originCity, Set<Interest> interests) {
}
