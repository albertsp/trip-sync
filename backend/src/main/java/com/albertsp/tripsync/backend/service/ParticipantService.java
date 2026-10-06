package com.albertsp.tripsync.backend.service;


import com.albertsp.tripsync.backend.domain.Availability;
import com.albertsp.tripsync.backend.domain.Participant;
import com.albertsp.tripsync.backend.domain.Trip;
import com.albertsp.tripsync.backend.dtos.CreateParticipantRequest;
import com.albertsp.tripsync.backend.exceptions.InvalidRequestException;
import com.albertsp.tripsync.backend.repositories.AvailabilityRepository;
import com.albertsp.tripsync.backend.repositories.ParticipantRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ParticipantService {

    private static final int MAX_NAME_LENGTH = 80;
    private static final int MAX_ORIGIN_CITY_LENGTH = 80;
    private static final int MAX_NOTES_LENGTH = 200;

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

        validateBasics(trip, request);
        String originCity = validatePreferences(request);

        Participant participant = new Participant();

        participant.setTrip(trip);
        participant.setName(request.name().trim());
        participant.setBudgetAmount(request.budgetAmount());
        participant.setBudgetCurrency(request.budgetCurrency());
        participant.setEditToken(UUID.randomUUID());
        participant.setCreatedAt(LocalDateTime.now());
        participant.setDestinationType(request.destinationType());
        participant.setOriginCity(originCity);
        participant.setNotes(normalizeNotes(request.notes()));
        if (request.interests() != null) {
            participant.setInterests(new HashSet<>(request.interests()));
        }

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

    /** Name, budget and available dates: the rest of the app (summary, prompts) assumes these are sane. */
    private void validateBasics(Trip trip, CreateParticipantRequest request) {
        if (request.name() == null || request.name().isBlank()) {
            throw new InvalidRequestException("El nombre es obligatorio");
        }
        if (request.name().trim().length() > MAX_NAME_LENGTH) {
            throw new InvalidRequestException("El nombre no puede superar los " + MAX_NAME_LENGTH + " caracteres");
        }
        if (request.budgetAmount() != null && request.budgetAmount().signum() < 0) {
            throw new InvalidRequestException("El presupuesto no puede ser negativo");
        }
        if (request.availableDates() == null) {
            throw new InvalidRequestException("Indica tu disponibilidad");
        }
        boolean outsideWindow = request.availableDates().stream()
                .anyMatch(day -> day == null || day.isBefore(trip.getWindowStart()) || day.isAfter(trip.getWindowEnd()));
        if (outsideWindow) {
            throw new InvalidRequestException("Hay fechas fuera de la ventana del viaje");
        }
    }

    /** Validates the trip preferences and returns the trimmed origin city. */
    private String validatePreferences(CreateParticipantRequest request) {
        if (request.destinationType() == null) {
            throw new InvalidRequestException("Elige el tipo de destino");
        }

        String originCity = request.originCity() == null ? "" : request.originCity().trim();
        if (originCity.isEmpty()) {
            throw new InvalidRequestException("La ciudad de origen es obligatoria");
        }
        if (originCity.length() > MAX_ORIGIN_CITY_LENGTH) {
            throw new InvalidRequestException("La ciudad de origen no puede superar los " + MAX_ORIGIN_CITY_LENGTH + " caracteres");
        }

        String notes = normalizeNotes(request.notes());
        if (notes != null && notes.length() > MAX_NOTES_LENGTH) {
            throw new InvalidRequestException("Las notas no pueden superar los " + MAX_NOTES_LENGTH + " caracteres");
        }

        return originCity;
    }

    /** Trims the notes; blank notes are stored as null. */
    private String normalizeNotes(String notes) {
        if (notes == null) {
            return null;
        }
        String trimmed = notes.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
