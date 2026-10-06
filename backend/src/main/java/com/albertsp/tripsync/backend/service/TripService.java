package com.albertsp.tripsync.backend.service;

import com.albertsp.tripsync.backend.domain.Trip;
import com.albertsp.tripsync.backend.domain.User;
import com.albertsp.tripsync.backend.dtos.CreateTripRequest;
import com.albertsp.tripsync.backend.exceptions.InvalidRequestException;
import com.albertsp.tripsync.backend.exceptions.ResourceNotFoundException;
import com.albertsp.tripsync.backend.repositories.TripRepository;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class TripService {

    private static final int MIN_DURATION_DAYS = 1;
    private static final int MAX_DURATION_DAYS = 30;

    private final TripRepository tripRepository;
    private final UserService userService;
    public TripService(TripRepository tripRepository, UserService userService) {
        this.tripRepository = tripRepository;
        this.userService = userService;
    }

    public Trip createTrip(CreateTripRequest request, OAuth2User principal   ){
        validatePreferredDuration(request.preferredDurationDays());

        User user = userService.findOrCreateUser(principal);

        Trip trip = new Trip();

        trip.setCreator(user);
        trip.setTitle(request.title());
        trip.setWindowStart(request.windowStart());
        trip.setWindowEnd(request.windowEnd());
        trip.setPreferredDurationDays(request.preferredDurationDays());

        return tripRepository.save(trip);
    }

    /** The duration is optional (null means the generator's default), but when present it must be 1-30 days. */
    private void validatePreferredDuration(Integer days) {
        if (days != null && (days < MIN_DURATION_DAYS || days > MAX_DURATION_DAYS)) {
            throw new InvalidRequestException("La duración debe estar entre " + MIN_DURATION_DAYS + " y " + MAX_DURATION_DAYS + " días");
        }
    }

    public Trip getTripEntityById(UUID id) {
        return tripRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(" Trip not found with id: " + id));
    }
}
