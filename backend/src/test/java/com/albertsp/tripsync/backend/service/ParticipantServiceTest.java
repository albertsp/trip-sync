package com.albertsp.tripsync.backend.service;

import com.albertsp.tripsync.backend.domain.DestinationType;
import com.albertsp.tripsync.backend.domain.Interest;
import com.albertsp.tripsync.backend.domain.Participant;
import com.albertsp.tripsync.backend.domain.Trip;
import com.albertsp.tripsync.backend.domain.TripCurrency;
import com.albertsp.tripsync.backend.dtos.CreateParticipantRequest;
import com.albertsp.tripsync.backend.exceptions.InvalidRequestException;
import com.albertsp.tripsync.backend.exceptions.ResourceNotFoundException;
import com.albertsp.tripsync.backend.repositories.AvailabilityRepository;
import com.albertsp.tripsync.backend.repositories.ParticipantRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ParticipantServiceTest {

    @Mock
    private AvailabilityRepository availabilityRepository;
    @Mock
    private ParticipantRepository participantRepository;
    @Mock
    private TripService tripService;

    private ParticipantService service;
    private final UUID tripId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new ParticipantService(availabilityRepository, participantRepository, tripService);
    }

    private Trip trip() {
        Trip trip = new Trip();
        trip.setWindowStart(LocalDate.of(2026, 10, 1));
        trip.setWindowEnd(LocalDate.of(2026, 10, 10));
        return trip;
    }

    private void stubTripAndSave() {
        when(tripService.getTripEntityById(tripId)).thenReturn(trip());
        when(participantRepository.save(any(Participant.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private CreateParticipantRequest request(DestinationType type, String origin, Set<Interest> interests, String notes) {
        return new CreateParticipantRequest("Ana", new BigDecimal("300"), TripCurrency.EUR,
                Set.of(LocalDate.of(2026, 10, 2)), type, origin, interests, notes);
    }

    @Test
    void savesPreferencesWithTrimmedOriginAndNotes() {
        stubTripAndSave();

        Participant saved = service.createParticipant(tripId,
                request(DestinationType.BEACH, "  Madrid  ", Set.of(Interest.RELAX, Interest.CULTURE), "  sin vuelos  "));

        assertEquals(DestinationType.BEACH, saved.getDestinationType());
        assertEquals("Madrid", saved.getOriginCity());
        assertEquals("sin vuelos", saved.getNotes());
        assertEquals(Set.of(Interest.RELAX, Interest.CULTURE), saved.getInterests());
        assertNotNull(saved.getEditToken());
        verify(availabilityRepository).saveAll(any());
    }

    @Test
    void blankNotesAreStoredAsNull() {
        stubTripAndSave();

        Participant saved = service.createParticipant(tripId, request(DestinationType.CITY, "Madrid", null, "   "));

        assertNull(saved.getNotes());
        assertTrue(saved.getInterests().isEmpty());
    }

    @Test
    void rejectsMissingDestinationType() {
        when(tripService.getTripEntityById(tripId)).thenReturn(trip());

        assertThrows(InvalidRequestException.class,
                () -> service.createParticipant(tripId, request(null, "Madrid", null, null)));
        verify(participantRepository, never()).save(any());
    }

    @Test
    void rejectsBlankOriginCity() {
        when(tripService.getTripEntityById(tripId)).thenReturn(trip());

        assertThrows(InvalidRequestException.class,
                () -> service.createParticipant(tripId, request(DestinationType.CITY, "   ", null, null)));
        assertThrows(InvalidRequestException.class,
                () -> service.createParticipant(tripId, request(DestinationType.CITY, null, null, null)));
    }

    @Test
    void rejectsTooLongOriginCityAndNotes() {
        when(tripService.getTripEntityById(tripId)).thenReturn(trip());

        assertThrows(InvalidRequestException.class,
                () -> service.createParticipant(tripId, request(DestinationType.CITY, "x".repeat(81), null, null)));
        assertThrows(InvalidRequestException.class,
                () -> service.createParticipant(tripId, request(DestinationType.CITY, "Madrid", null, "x".repeat(201))));
    }

    @Test
    void acceptsLimitLengths() {
        stubTripAndSave();

        Participant saved = service.createParticipant(tripId,
                request(DestinationType.CITY, "x".repeat(80), null, "y".repeat(200)));

        assertEquals(80, saved.getOriginCity().length());
        assertEquals(200, saved.getNotes().length());
    }

    @Test
    void propagatesUnknownTrip() {
        when(tripService.getTripEntityById(tripId)).thenThrow(new ResourceNotFoundException("nope"));

        assertThrows(ResourceNotFoundException.class,
                () -> service.createParticipant(tripId, request(DestinationType.CITY, "Madrid", null, null)));
    }

    @Test
    void rejectsBlankNameNegativeBudgetMissingAndOutOfWindowDates() {
        when(tripService.getTripEntityById(tripId)).thenReturn(trip());
        Set<LocalDate> inside = Set.of(LocalDate.of(2026, 10, 2));

        assertThrows(InvalidRequestException.class, () -> service.createParticipant(tripId,
                new CreateParticipantRequest("  ", null, TripCurrency.EUR, inside, DestinationType.CITY, "Madrid", null, null)));
        assertThrows(InvalidRequestException.class, () -> service.createParticipant(tripId,
                new CreateParticipantRequest("Ana", new BigDecimal("-1"), TripCurrency.EUR, inside, DestinationType.CITY, "Madrid", null, null)));
        assertThrows(InvalidRequestException.class, () -> service.createParticipant(tripId,
                new CreateParticipantRequest("Ana", null, TripCurrency.EUR, null, DestinationType.CITY, "Madrid", null, null)));
        assertThrows(InvalidRequestException.class, () -> service.createParticipant(tripId,
                new CreateParticipantRequest("Ana", null, TripCurrency.EUR, Set.of(LocalDate.of(2027, 1, 1)), DestinationType.CITY, "Madrid", null, null)));
        verify(participantRepository, never()).save(any());
    }
}
