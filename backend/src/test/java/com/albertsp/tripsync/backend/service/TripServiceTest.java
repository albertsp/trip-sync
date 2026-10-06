package com.albertsp.tripsync.backend.service;

import com.albertsp.tripsync.backend.domain.Trip;
import com.albertsp.tripsync.backend.domain.User;
import com.albertsp.tripsync.backend.dtos.CreateTripRequest;
import com.albertsp.tripsync.backend.exceptions.InvalidRequestException;
import com.albertsp.tripsync.backend.exceptions.ResourceNotFoundException;
import com.albertsp.tripsync.backend.repositories.TripRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.core.user.OAuth2User;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TripServiceTest {

    @Mock
    private TripRepository tripRepository;
    @Mock
    private UserService userService;
    @Mock
    private OAuth2User principal;

    private TripService service;

    @BeforeEach
    void setUp() {
        service = new TripService(tripRepository, userService);
    }

    private CreateTripRequest request(Integer duration) {
        return new CreateTripRequest("Escapada", LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 10), duration);
    }

    private void stubCreate(User creator) {
        when(userService.findOrCreateUser(principal)).thenReturn(creator);
        when(tripRepository.save(any(Trip.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void storesDurationAndCreator() {
        User creator = new User();
        stubCreate(creator);

        Trip trip = service.createTrip(request(4), principal);

        assertEquals(4, trip.getPreferredDurationDays());
        assertSame(creator, trip.getCreator());
    }

    @Test
    void durationIsOptional() {
        stubCreate(new User());

        assertNull(service.createTrip(request(null), principal).getPreferredDurationDays());
    }

    @Test
    void acceptsDurationLimits() {
        stubCreate(new User());

        assertEquals(1, service.createTrip(request(1), principal).getPreferredDurationDays());
        assertEquals(30, service.createTrip(request(30), principal).getPreferredDurationDays());
    }

    @Test
    void rejectsDurationOutOfRange() {
        assertThrows(InvalidRequestException.class, () -> service.createTrip(request(0), principal));
        assertThrows(InvalidRequestException.class, () -> service.createTrip(request(31), principal));
        assertThrows(InvalidRequestException.class, () -> service.createTrip(request(-3), principal));
        verify(tripRepository, never()).save(any());
    }

    @Test
    void unknownTripThrowsNotFound() {
        UUID id = UUID.randomUUID();
        when(tripRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.getTripEntityById(id));
    }
}
