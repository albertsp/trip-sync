package com.albertsp.tripsync.backend.dtos;

import com.albertsp.tripsync.backend.domain.DestinationType;
import com.albertsp.tripsync.backend.domain.Interest;
import com.albertsp.tripsync.backend.domain.TripCurrency;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Set;

public record CreateParticipantRequest(String name, BigDecimal budgetAmount, TripCurrency budgetCurrency, Set<LocalDate> availableDates, DestinationType destinationType, String originCity, Set<Interest> interests, String notes) {
}
