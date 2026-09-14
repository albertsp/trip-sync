package com.albertsp.tripsync.backend.service;

import com.albertsp.tripsync.backend.domain.Trip;
import com.albertsp.tripsync.backend.domain.User;
import com.albertsp.tripsync.backend.dtos.CreateTripRequest;
import com.albertsp.tripsync.backend.exceptions.ResourceNotFoundException;
import com.albertsp.tripsync.backend.repositories.TripRepository;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class TripService {

    private final TripRepository tripRepository;
    private final UserService userService;
    public TripService(TripRepository tripRepository, UserService userService) {
        this.tripRepository = tripRepository;
        this.userService = userService;
    }

    public Trip createTrip(CreateTripRequest request, OAuth2User principal   ){
        User user = userService.findOrCreateUser(principal);

        Trip trip = new Trip();

        trip.setCreator(user);
        trip.setTitle(request.title());
        trip.setWindowStart(request.windowStart());
        trip.setWindowEnd(request.windowEnd());

        return tripRepository.save(trip);
    }

    public Trip getTripEntityById(UUID id) {
        return tripRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(" Trip not found with id: " + id));
    }
}
