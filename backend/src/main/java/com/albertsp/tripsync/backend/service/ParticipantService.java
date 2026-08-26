package com.albertsp.tripsync.backend.service;


import com.albertsp.tripsync.backend.domain.Availability;
import com.albertsp.tripsync.backend.domain.Participant;
import com.albertsp.tripsync.backend.domain.Trip;
import com.albertsp.tripsync.backend.dtos.CreateParticipantRequest;
import com.albertsp.tripsync.backend.repositories.AvailabilityRepository;
import com.albertsp.tripsync.backend.repositories.ParticipantRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ParticipantService {


    private final AvailabilityRepository availabilityRepository;
    private final ParticipantRepository participantRepository;
    private final TripService tripService;

    public ParticipantService (AvailabilityRepository availabilityRepository, ParticipantRepository participantRepository, TripService tripService){

        this.availabilityRepository = availabilityRepository;
        this.participantRepository = participantRepository;
        this.tripService = tripService;
    }


    @Transactional
    public Participant createParticipant(UUID tripId, CreateParticipantRequest request) {
        Trip trip = tripService.getTripEntityById(tripId);

        Participant participant = new Participant();

        participant.setTrip(trip);
        participant.setName(request.name());
        participant.setBudgetAmount(request.budgetAmount());
        participant.setBudgetCurrency(request.budgetCurrency());
        participant.setEditToken(UUID.randomUUID());
        participant.setCreatedAt(LocalDateTime.now());

        Participant savedParticipant = participantRepository.save(participant);

        List<Availability> availabilities = request.availableDates().stream().map(date ->{
            Availability availability = new Availability();
            availability.setParticipant(savedParticipant);
            availability.setDay(date);
            return availability;
        }).collect(Collectors.toList());

        availabilityRepository.saveAll(availabilities);
        return savedParticipant;
    }
}
