package com.albertsp.tripsync.backend.service;

import com.albertsp.tripsync.backend.domain.Availability;
import com.albertsp.tripsync.backend.domain.Participant;
import com.albertsp.tripsync.backend.domain.Trip;
import com.albertsp.tripsync.backend.dtos.SummaryResponse;
import com.albertsp.tripsync.backend.repositories.AvailabilityRepository;
import com.albertsp.tripsync.backend.repositories.ParticipantRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class SummaryService {


    private final AvailabilityRepository availabilityRepository;
    private final TripService tripService;
    private final ParticipantRepository participantRepository;


    public SummaryService (AvailabilityRepository availabilityRepository, TripService tripService, ParticipantRepository participantRepository) {
        this.availabilityRepository = availabilityRepository;
        this.tripService = tripService;
        this.participantRepository = participantRepository;
    }

    public SummaryResponse getSummary(UUID tripId) {

        Trip trip = tripService.getTripEntityById(tripId);
        List<Availability> availabilities = availabilityRepository.findByParticipantTripId(tripId);

        Map<LocalDate, Long> countByDay = availabilities.stream()
                .collect(Collectors.groupingBy(availability -> availability.getDay(), Collectors.counting()));

        Map<LocalDate, Long> fullSummary = trip.getWindowStart().datesUntil(trip.getWindowEnd().plusDays(1))
                .collect(Collectors.toMap(
                        day -> day,
                        day -> countByDay.getOrDefault(day,0L)
                ));
        List<Participant> participants = participantRepository.findByTripId(tripId);

        Optional<BigDecimal> minBudget = participants.stream()
                .map((participant -> participant.getBudgetAmount()))
                .min(Comparator.naturalOrder());
        BigDecimal minBudgetValue = minBudget.orElse(null);

        return new SummaryResponse(fullSummary,minBudgetValue);
    }
}
