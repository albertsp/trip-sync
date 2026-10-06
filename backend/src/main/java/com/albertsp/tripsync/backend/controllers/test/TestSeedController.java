package com.albertsp.tripsync.backend.controllers.test;


import com.albertsp.tripsync.backend.domain.Trip;
import com.albertsp.tripsync.backend.domain.User;
import com.albertsp.tripsync.backend.dtos.CreateTripRequest;
import com.albertsp.tripsync.backend.dtos.ProposalsResponse;
import com.albertsp.tripsync.backend.dtos.TripResponse;
import com.albertsp.tripsync.backend.repositories.TripRepository;
import com.albertsp.tripsync.backend.exceptions.ResourceNotFoundException;
import com.albertsp.tripsync.backend.service.TripProposalService;
import com.albertsp.tripsync.backend.service.UserService;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@Profile("!prod")
@RequestMapping("/test")
public class TestSeedController {
    private final TripRepository tripRepository;
    private final UserService userService;
    private final TripProposalService proposalService;

    public TestSeedController(TripRepository tripRepository, UserService userService, TripProposalService proposalService) {
        this.tripRepository = tripRepository;
        this.userService = userService;
        this.proposalService = proposalService;
    }
    @PostMapping("/trips")
    public ResponseEntity<TripResponse> seedTrip(@RequestBody CreateTripRequest request) {
        User testUser = userService.findOrCreateTestUser();

        Trip trip = new Trip();
        trip.setCreator(testUser);
        trip.setTitle(request.title());
        trip.setWindowStart(request.windowStart());
        trip.setWindowEnd(request.windowEnd());
        trip.setPreferredDurationDays(request.preferredDurationDays());

        Trip saved = tripRepository.save(trip);

        TripResponse response = TripResponse.from(saved);
        return ResponseEntity.ok(response);
    }

    /**
     * Generates proposals as the trip creator without an OAuth session, so a developer (or an e2e run)
     * with {@code LLM_PROVIDER=fake} can reach the voting stage. Same rules and limits as the real endpoint.
     */
    @PostMapping("/trips/{tripId}/proposals")
    public ResponseEntity<ProposalsResponse> seedProposals(@PathVariable UUID tripId) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new ResourceNotFoundException("Trip not found with id: " + tripId));
        return ResponseEntity.ok(proposalService.generate(tripId, trip.getCreator().getId()));
    }
}
