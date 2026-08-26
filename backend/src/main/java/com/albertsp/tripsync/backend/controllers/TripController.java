package com.albertsp.tripsync.backend.controllers;

import com.albertsp.tripsync.backend.dtos.CreateTripRequest;
import com.albertsp.tripsync.backend.dtos.TripResponse;
import com.albertsp.tripsync.backend.exceptions.ResourceNotFoundException;
import com.albertsp.tripsync.backend.domain.Trip;
import com.albertsp.tripsync.backend.repositories.TripRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.UUID;


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

    @GetMapping("/trips/{id}")
    public ResponseEntity<TripResponse> getTripById(@PathVariable UUID id){

        Trip trip = tripRepository.findById(id)
                .orElseThrow( () -> new ResourceNotFoundException(" Trip not found with id: " + id));

        TripResponse response = new TripResponse(trip.getId(),trip.getTitle(), trip.getWindowStart(), trip.getWindowEnd(), trip.getStatus(), trip.getCreatedAt());

        return ResponseEntity.ok(response);
    }
}
