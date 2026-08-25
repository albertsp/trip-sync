package com.albertsp.tripsync.backend.controllers;

import com.albertsp.tripsync.backend.controllers.dtos.CreateTripRequest;
import com.albertsp.tripsync.backend.controllers.dtos.TripResponse;
import com.albertsp.tripsync.backend.domain.Trip;
import com.albertsp.tripsync.backend.repositories.TripRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;


@RestController
public class TripController {

    private final TripRepository tripRepository;

    public TripController(TripRepository tripRepository) {
        this.tripRepository = tripRepository;
    }


    @PostMapping("/trips")
    public ResponseEntity<TripResponse> createTrip(@RequestBody CreateTripRequest request) {

        Trip trip = new Trip();

        trip.setTitle(request.title());
        trip.setWindowStart(request.windowStart());
        trip.setWindowEnd(request.windowEnd());

        Trip saved = tripRepository.save(trip);

        TripResponse response = new TripResponse(saved.getId(), saved.getTitle(), saved.getWindowStart(), saved.getWindowEnd(), saved.getStatus(), saved.getCreatedAt());

        return ResponseEntity.created(URI.create("/trips/" + saved.getId())).body(response);
    }
}
