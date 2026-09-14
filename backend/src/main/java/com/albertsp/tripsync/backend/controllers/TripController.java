package com.albertsp.tripsync.backend.controllers;

import com.albertsp.tripsync.backend.dtos.CreateTripRequest;
import com.albertsp.tripsync.backend.dtos.TripResponse;
import com.albertsp.tripsync.backend.domain.Trip;
import com.albertsp.tripsync.backend.service.TripService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.UUID;


@RestController
public class TripController {

    private final TripService tripService;

    public TripController(TripService tripService) {
        this.tripService = tripService;
    }


    @PostMapping("/trips")
    public ResponseEntity<TripResponse> createTrip(@RequestBody CreateTripRequest request, @AuthenticationPrincipal OAuth2User principal) {

        Trip saved = tripService.createTrip(request, principal);

        TripResponse response = new TripResponse(saved.getId(), saved.getTitle(), saved.getWindowStart(), saved.getWindowEnd(), saved.getStatus(), saved.getCreatedAt());

        return ResponseEntity.created(URI.create("/trips/" + saved.getId())).body(response);
    }

    @GetMapping("/trips/{id}")
    public ResponseEntity<TripResponse> getTripById(@PathVariable UUID id){

        Trip trip = tripService.getTripEntityById(id);

        TripResponse response = new TripResponse(trip.getId(),trip.getTitle(), trip.getWindowStart(), trip.getWindowEnd(), trip.getStatus(), trip.getCreatedAt());

        return ResponseEntity.ok(response);
    }


}
